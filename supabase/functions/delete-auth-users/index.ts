// ============================================================
// EYE Workflow Hub — Supabase Edge Function
// delete-auth-users
//
// Called by the React app after it has already deleted the
// matching rows from public.profiles (and dependent tables).
// This function is the ONLY place in the system that can remove
// rows from auth.users, because that requires the service_role
// key, which is never exposed to the browser.
//
// Security:
//   - Caller must be authenticated (passes their JWT in the
//     Authorization header).
//   - Caller's profile.role must be 'Super Admin'.
//   - Caller cannot delete their own auth user (safety net).
//
// Graceful handling:
//   - If an id has no matching auth.users row (e.g. an
//     admin-added member who never self-registered), we report
//     it as "skipped", not "failed".
//
// Deploy with:
//   supabase functions deploy delete-auth-users --no-verify-jwt
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // 1) Extract the caller's JWT
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace(/^Bearer\s+/i, '')
    if (!jwt) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2) Admin client (uses service_role from env)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 3) Verify the caller
    const { data: callerAuth, error: callerErr } =
      await supabaseAdmin.auth.getUser(jwt)
    if (callerErr || !callerAuth?.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const callerId = callerAuth.user.id

    // 4) Check the caller's role in public.profiles
    const { data: callerProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('role, email')
      .eq('id', callerId)
      .single()

    if (profileErr || !callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Caller profile not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (callerProfile.role !== 'Super Admin') {
      return new Response(
        JSON.stringify({ error: 'Only Super Admin can delete auth users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5) Parse and validate the userIds payload
    const body = await req.json().catch(() => ({}))
    const userIds: unknown = body?.userIds
    if (
      !Array.isArray(userIds) ||
      userIds.length === 0 ||
      !userIds.every((x) => typeof x === 'string')
    ) {
      return new Response(
        JSON.stringify({ error: 'userIds must be a non-empty array of strings' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6) Safety net: never let the caller delete their own auth user
    const safeIds = (userIds as string[]).filter((id) => id !== callerId)
    if (safeIds.length === 0) {
      return new Response(
        JSON.stringify({
          deleted: 0,
          skipped: 0,
          failed: 0,
          note: 'Nothing to do (caller was the only id in the list).',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7) Delete each auth user. Graceful: missing users are "skipped",
    //    not "failed" (admin-added members with no login have no row here).
    const deleted: string[] = []
    const skipped: string[] = []
    const failed: { id: string; error: string }[] = []

    for (const id of safeIds) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
      if (!error) {
        deleted.push(id)
      } else {
        const msg = error.message ?? ''
        const isMissing =
          /user not found/i.test(msg) ||
          /not found/i.test(msg) ||
          (error as any).status === 404
        if (isMissing) {
          skipped.push(id)
        } else {
          failed.push({ id, error: msg })
        }
      }
    }

    return new Response(
      JSON.stringify({
        deleted: deleted.length,
        skipped: skipped.length,
        failed: failed.length,
        deleted_ids: deleted,
        skipped_ids: skipped,
        failed_details: failed,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
