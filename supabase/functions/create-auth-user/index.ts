/**
 * Supabase Edge Function — create-auth-user
 *
 * Creates a Supabase Auth user AND inserts the matching profile row
 * in public.profiles in a single call. This is needed because the
 * public anon key (which the browser uses) cannot create other users
 * in auth.users — that requires the service_role key, which must
 * stay server-side.
 *
 * Setup:
 *   1. Deploy this function:
 *        supabase functions deploy create-auth-user --no-verify-jwt
 *   2. From the React app, call:
 *        supabase.functions.invoke('create-auth-user', { body: {...} })
 *
 * Request body (JSON):
 *   {
 *     "email":     "user@example.com",
 *     "password":  "secret",
 *     "fullName":  "User Name",
 *     "role":      "Leader" | "Member" | "Super Admin" | ...,
 *     "status":    "Active" (default),
 *     "committee": "HR",
 *     "department": "HRM",
 *     "membershipCode": "EYE-HR-L0001"   // optional, auto-generated if missing
 *   }
 *
 * Returns:
 *   { ok: true, userId, profileId, membershipCode }   on success
 *   { ok: false, error: "..." }                       on failure
 */

// deno-lift-ignore-file no-import-prefix
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Deno.serve is the modern runtime API for Supabase Edge Functions.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const {
    email,
    password,
    fullName,
    phoneNumber = '+201000000000',
    role = 'Member',
    status = 'Active',
    committee = 'None',
    department = 'None',
    membershipCode,
  } = body || {};

  if (!email || !password || !fullName) {
    return json(
      { ok: false, error: 'email, password, and fullName are required' },
      400
    );
  }
  if (String(password).length < 6) {
    return json(
      { ok: false, error: 'Password must be at least 6 characters' },
      400
    );
  }

  // 1) Create the auth user (Supabase Auth)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // auto-confirm so they can log in immediately
  });
  if (createErr || !created?.user) {
    return json(
      { ok: false, error: createErr?.message || 'Could not create auth user' },
      400
    );
  }
  const userId = created.user.id;

  // 2) Auto-generate membership_code if not provided
  let finalCode = membershipCode;
  if (!finalCode) {
    const { count } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    const padded = String((count || 0) + 1).padStart(4, '0');
    const rolePrefix =
      role === 'Leader' ? 'L' :
      role === 'Vice' ? 'V' :
      role === 'Coordinator' ? 'C' :
      role === 'Deputy Coordinator' ? 'DC' : '';
    finalCode = `EYE-${committee || 'M'}-${rolePrefix}${padded}`;
  }

  // 3) Insert the matching profile row
  const { error: profileErr } = await admin.from('profiles').insert({
    id: userId,
    full_name: fullName,
    email,
    phone_number: phoneNumber,
    role,
    status,
    committee,
    department,
    membership_code: finalCode,
    joined_date: new Date().toISOString().split('T')[0],
    avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}&backgroundColor=0b59b1`,
    bio: `Official ${role} of the ${department} department.`,
  });

  if (profileErr) {
    // Roll back the auth user so we don't leave a dangling login
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    return json(
      { ok: false, error: `Auth user created but profile insert failed: ${profileErr.message}` },
      400
    );
  }

  return json({
    ok: true,
    userId,
    profileId: userId,
    membershipCode: finalCode,
  });
});
