# CardTrack — Release Guide

End-to-end, step-by-step guide to take this app from a local repo to a live production PWA with Gmail-based bill auto-detection.

Use this guide in order. Each section ends with a verification step.

---

## 0. Prerequisites

You need accounts on:
1. Supabase — https://supabase.com
2. Google Cloud Console — https://console.cloud.google.com
3. Google AI Studio — https://aistudio.google.com
4. Vercel (or any Next.js host) — https://vercel.com
5. GitHub (for source hosting)

Local tools:
1. Node.js 20+
2. pnpm 9+
3. Supabase CLI — `brew install supabase/tap/supabase`
4. Git
5. Deno (only required if you want to run Edge Functions locally) — `brew install deno`

Verify:
```bash
node -v
pnpm -v
supabase --version
git --version
```

---

## 1. Create the Supabase project

1. Go to https://supabase.com/dashboard → New project.
2. Choose a region close to your users (for India: Mumbai/Singapore).
3. Set a strong database password and save it in a password manager.
4. Wait for provisioning to complete.

From Project Settings → API copy and store securely:
1. Project URL (e.g. `https://abcd1234.supabase.co`)
2. anon public key
3. service_role secret key
4. Project ref (the `abcd1234` part of the URL)

---

## 2. Configure Google Cloud (OAuth + Gmail API)

### 2.1 Create / select a project
1. Open Google Cloud Console.
2. Create a new project (e.g. `cardtrack-prod`).

### 2.2 Enable APIs
1. APIs & Services → Library.
2. Enable: Gmail API.

### 2.3 OAuth consent screen
1. APIs & Services → OAuth consent screen.
2. User type: External.
3. Fill App name, support email, developer contact.
4. Scopes: add
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/gmail.readonly`
5. Add yourself as a Test user while the app is in Testing mode.

### 2.4 Create OAuth Client ID
1. APIs & Services → Credentials → Create Credentials → OAuth client ID.
2. Application type: Web application.
3. Authorized redirect URIs:
   - `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback`
4. Save and copy:
   - Client ID
   - Client Secret

---

## 3. Wire Google OAuth into Supabase

1. Supabase Dashboard → Authentication → Providers → Google.
2. Enable Google.
3. Paste Client ID and Client Secret from step 2.4.
4. Add scopes (space-separated):
   ```
   openid email profile https://www.googleapis.com/auth/gmail.readonly
   ```
5. Save.

In Authentication → URL Configuration:
1. Site URL: `https://your-production-domain.com`
2. Additional redirect URLs:
   - `http://localhost:3000/**`
   - `https://your-production-domain.com/**`

---

## 4. Get a Gemini API key

1. Open Google AI Studio → Get API key.
2. Create a key in the same Google Cloud project (recommended).
3. Save the key — used as `GEMINI_API_KEY` in Supabase Edge Function secrets.

---

## 5. Local repo setup

```bash
git clone <your-repo-url>
cd cardtrack-app
pnpm install
cp .env.example .env.local
```

Fill `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Run locally to verify:
```bash
pnpm dev
```
Open http://localhost:3000 and confirm the landing/login page renders.

---

## 6. Apply database schema

### Option A — Supabase CLI (recommended)
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```
This applies everything under `supabase/migrations/`, including:
- All tables (`profiles`, `credit_cards`, `bills`, `email_log`, `notifications`)
- RLS policies
- The `handle_new_user` trigger that creates a profile row on first login

### Option B — SQL editor (manual)
1. Supabase Dashboard → SQL Editor.
2. Paste the contents of `supabase/migrations/001_initial_schema.sql`.
3. Run.

Verify in Table Editor that the tables exist and RLS is enabled (lock icon) on each.

---

## 7. Deploy Supabase Edge Functions

The app ships two functions under `supabase/functions/`:

1. `fetch-emails` — Triggered by pg_cron (and the in-app Settings button) to scan Gmail for statement emails.
2. `parse-statement` — Called by `fetch-emails` per email; uses Gemini to extract bill details and upsert into `bills`.

### 7.1 Authenticate and link the Supabase CLI
```bash
supabase login            # opens browser to authenticate
supabase link --project-ref YOUR_PROJECT_REF
```

### 7.2 Set Edge Function secrets
These secrets are read inside the function code as `Deno.env.get(...)`.

```bash
supabase secrets set \
  GEMINI_API_KEY=your-gemini-api-key \
  SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

List them to confirm:
```bash
supabase secrets list
```

### 7.3 Deploy each function
```bash
supabase functions deploy fetch-emails
supabase functions deploy parse-statement
```

Each command:
- Bundles the Deno code under `supabase/functions/<name>/index.ts`
- Uploads it to your Supabase project
- Makes it available at `https://YOUR_PROJECT_REF.supabase.co/functions/v1/<name>`

If you want functions to be invokable without a JWT (not recommended for these), append `--no-verify-jwt`. We do NOT use that here — we always pass `Authorization: Bearer <key>`.

### 7.4 Verify deployment
```bash
supabase functions list
```
Both functions should show as deployed with a recent timestamp.

Also visible in Supabase Dashboard → Edge Functions.

### 7.5 Tail logs while testing
```bash
supabase functions logs fetch-emails --tail
supabase functions logs parse-statement --tail
```

### 7.6 Smoke test `parse-statement`
```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/parse-statement" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "00000000-0000-0000-0000-000000000000",
    "email_body": "test",
    "gmail_message_id": "smoke-test-1",
    "subject": "Test",
    "sender": "test@example.com",
    "received_at": "2026-01-01T00:00:00Z"
  }'
```
You should receive a JSON response. For a non-statement payload it will say `"Not a credit card statement"`. Errors typically indicate a missing `GEMINI_API_KEY`.

### 7.7 Smoke test `fetch-emails`
```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/fetch-emails" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```
Watch the tail logs in another terminal. You should see it iterate users and exit cleanly.

### 7.8 Re-deploying after code changes
After editing files under `supabase/functions/<name>/index.ts`:
```bash
supabase functions deploy <name>
```

### 7.9 Optional: run a function locally
```bash
supabase functions serve parse-statement --env-file ./supabase/.env.local
```
Create `supabase/.env.local` containing `GEMINI_API_KEY=...`, `SUPABASE_URL=...`, `SUPABASE_SERVICE_ROLE_KEY=...` (this file MUST NOT be committed).

---

## 8. Schedule the cron job (pg_cron)

In Supabase Dashboard → SQL Editor, run once:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'fetch-emails',
  '0 */6 * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/fetch-emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )
  $$
);
```

Verify:
```sql
select * from cron.job;
select * from cron.job_run_details order by start_time desc limit 5;
```

To remove later:
```sql
select cron.unschedule('fetch-emails');
```

---

## 9. Push code to GitHub

```bash
git add .
git commit -m "chore: release setup"
git push origin main
```

Do NOT commit `.env.local`. It is already gitignored by Next.js defaults — verify with `git status` before pushing.

---

## 10. Deploy frontend to Vercel

1. Vercel Dashboard → Add New → Project → import your GitHub repo.
2. Framework Preset: Next.js (auto-detected).
3. Build settings: leave defaults (uses `pnpm build` from `package.json`, which forces webpack mode for Serwist compatibility).
4. Environment Variables (Production + Preview + Development):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (your Vercel domain, e.g. `https://cardtrack.vercel.app`)
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; required for the in-app "Fetch now" button)
5. Click Deploy.

After deploy:
1. Copy the production URL.
2. Update Supabase → Authentication → URL Configuration → Site URL and Additional redirect URLs to include this domain.
3. Update Google Cloud OAuth Client → Authorized redirect URIs if you added a custom domain.

---

## 11. End-to-end verification

1. Open the production URL.
2. Tap "Continue with Google" → consent screen should request Gmail read-only.
3. After approving, you should land on `/dashboard`.
4. Supabase Dashboard → Authentication → Users — confirm your user appears.
5. Table Editor → `profiles` — confirm a profile row was auto-created by the `handle_new_user` trigger.
6. Add a card via the UI and confirm it appears in `credit_cards`.
7. Settings → "Fetch statement emails now" — confirm it returns a success message and check `email_log` for new rows.
8. Manually re-invoke the cron function:
   ```bash
   curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/fetch-emails" \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
   ```
   Check Edge Function logs in the Supabase Dashboard.

---

## 12. PWA + Mobile checks

1. Open the production URL in Chrome desktop → DevTools → Application → Manifest. Confirm the manifest loads with no errors.
2. Application → Service Workers. Confirm `/sw.js` is registered and "activated and running".
3. On iOS Safari and Android Chrome, use "Add to Home Screen" and confirm the installed app opens standalone.
4. Lighthouse → PWA audit should pass installability checks.

---

## 13. Post-release hardening

1. Move OAuth consent screen from Testing → In Production in Google Cloud (required for non-test users). Triggers Google verification because of the sensitive `gmail.readonly` scope.
2. Set up Supabase database backups (Project Settings → Database → Backups).
3. Enable Vercel Analytics or your preferred RUM.
4. Add monitoring/alerts on Edge Function errors (Supabase Logs Explorer + an uptime monitor against the function URL).
5. Rotate the service role key if it was ever exposed.

---

## 14. Quick reference — what to store securely

| Item | Where used |
|---|---|
| Supabase Project URL | Client + Edge Functions |
| Supabase anon key | Client |
| Supabase service role key | Edge Functions + pg_cron header + Next.js server (`/api/trigger-fetch`) |
| Google OAuth Client ID | Supabase Auth provider config |
| Google OAuth Client Secret | Supabase Auth provider config |
| Gemini API key | Edge Function secret |
| Production domain | Supabase Auth + Vercel env |

Store these in a password manager. Never commit them to git.

---

## 15. Common issues

1. "Invalid supabaseUrl" at build time → `NEXT_PUBLIC_SUPABASE_URL` missing in Vercel env. Add it and redeploy.
2. Google login loops back to `/login` → Site URL / Redirect URLs misconfigured in Supabase or Google OAuth client.
3. Gmail scope not granted → OAuth consent screen scopes not saved, or user did not approve. Re-run OAuth with `prompt=consent`.
4. Edge Function 401 → wrong Authorization bearer (use `service_role` for cron and the in-app fetch button, `anon` for user-invoked calls).
5. pg_cron job not firing → `pg_cron` / `pg_net` extensions not enabled, or job not visible in `cron.job` table.
6. "Fetch statement emails now" returns a server error → `SUPABASE_SERVICE_ROLE_KEY` not set in your hosting environment.
7. Bills not appearing → check `email_log` table for `processing_status` and `processing_result` JSON for the failure reason.

---

You are now live.
