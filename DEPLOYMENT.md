# EYE Workflow Hub — Production Deployment Checklist

This is the runbook for taking the app from "code on your machine" to
"certificates actually arrive in the recipient's inbox" on Vercel.

Follow the sections in order. Each step has a single command or a
short checklist — there is no hidden magic.

---

## 1) Apply database migrations to your live Supabase project

Open https://supabase.com/dashboard and pick your project, then
**SQL Editor → New query**, and run each file in this order:

1. `supabase/schema.sql` — drops + recreates every table (safe to re-run)
2. `supabase/add-issued-certificates-table.sql` — the cert table
3. `supabase/fix-profiles-delete-policy.sql` — lets you bulk-delete members
4. `supabase/recreate-member-account.sql` — adds the `recreate_account()`
   SQL function and the example call to restore a deleted HR Head

After each file, the green "Success" banner at the bottom should
appear with no red text above it.

---

## 2) Sign up for Resend and get an API key

The Certificate Generator emails the recipient through the Resend API.
Without these env vars, the cert is still saved in the database and
shown on the profile, but the email step is skipped.

1. Go to https://resend.com and sign up (free tier is 3 000 emails/month
   and 100 emails/day — plenty for an org the size of EYE).
2. **Add a domain**: Domains → Add Domain → follow the DNS records.
   Use something like `mail.eye-egypt.org` if you have one; otherwise
   Resend's `onboarding@resend.dev` "from" works for testing but only
   sends to the address you signed up with.
3. **Create an API key**: API Keys → Create API Key → name it
   `eye-workflow-hub-prod` → copy it (you'll only see it once).

---

## 3) Configure Vercel environment variables

Open your Vercel project → **Settings → Environment Variables** and add
these for **all three** environments (Production, Preview, Development):

| Name                     | Example value                              | Notes                       |
|--------------------------|--------------------------------------------|-----------------------------|
| `VITE_SUPABASE_URL`      | `https://uvckrjskcxpxphywrqdn.supabase.co` | Already in your `.env`      |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi...`                            | Already in your `.env`      |
| `VITE_RESEND_API_KEY`    | `re_AbCdEf123...`                          | From step 2                 |
| `VITE_SENDER_EMAIL`      | `noreply@eye-egypt.org`                    | Must be on a verified domain|

After adding them, trigger a fresh deploy:
`Vercel → Deployments → ⋯ → Redeploy` (uncheck "use existing build
cache" so the new env vars are baked in).

---

## 4) Deploy the Edge Functions

Edge Functions run on Supabase's servers and need the `service_role`
key — that's why the browser can't do this work itself. From your
local machine:

```powershell
# Install the Supabase CLI if you don't have it yet
# (download from https://github.com/supabase/cli/releases)

# Login and link your project
supabase login
supabase link --project-ref uvckrjskcxpxphywrqdn

# Deploy both functions
supabase functions deploy delete-auth-users --no-verify-jwt
supabase functions deploy create-auth-user  --no-verify-jwt
```

You only need `create-auth-user` if you want to create accounts from
inside the app (e.g. a "Recreate deleted member" button in the
Admin panel). The `recreate-member-account.sql` function in step 1
already covers the same use-case from the SQL editor, so the
Edge Function is optional.

---

## 5) Restore your own account (if you were deleted)

The fastest way — no CLI, no Edge Function, just SQL:

1. Open the **SQL Editor** in your Supabase dashboard.
2. Open a new query and run the example at the bottom of
   `supabase/recreate-member-account.sql` (the call with
   `ahmedghannam801@gmail.com` / `Ahmed801*` / HRM Leader).
3. Wait for the green ✓ "Success" banner.
4. Sign in at https://eye-workflow-hub.vercel.app with the same
   email + password.

You should land on the dashboard as the **HRM Leader** (committee
HR, department HRM) with the `EYE-OWNER` membership code.

---

## 6) Smoke-test the certificate flow

After deploying, do this from the running app as a Super Admin:

1. Open **Settings → Members**, find a member, set them to
   `Active` if not already.
2. Open **Certificates** (left sidebar), pick a recipient, pick
   **Certificate of Appreciation**, click **Issue**.
3. Check three places:
   - ✅ The recipient's **profile** shows the cert under
     "My Certificates" (in-app database check).
   - ✅ The recipient's **notification bell** shows
     "📜 لديك شهادة جديدة!" (real-time check).
   - ✅ The recipient's **email inbox** receives a branded
     "EYE Tasks — شهادة جديدة لك" message from
     `noreply@your-domain.com` (Resend check).

If the email doesn't arrive, open the **browser console** (F12)
and look for `[EYE Email]` lines — the warning will tell you
exactly which env var is missing or which Resend error came back.
You can also retry from the **Settings → Email Delivery Alert
Banner** if the app queued the email locally.

---

## 7) Unlimited registrations — no extra setup needed

The `registerWithPassword` flow has no built-in cap, and the
`profiles` table uses `open insert` RLS so the Supabase backend
won't reject anyone. The only real-world limits are:

- **Supabase Free**: 50 000 monthly active users.
- **Supabase Pro**: scales further, with no hard ceiling on signups.

If you ever see the dreaded "rate limit" error in the auth UI, that
is a Supabase anti-abuse throttle (a few signups per minute per IP),
not a permanent cap. Wait 5 minutes and retry.
