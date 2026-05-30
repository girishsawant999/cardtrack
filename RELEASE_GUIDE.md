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
3. Save the key — used as `GEMINI_API_KEY` in the Next.js hosting environment.

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
GOOGLE_CLIENT_ID=YOUR_GOOGLE_OAUTH_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_OAUTH_CLIENT_SECRET
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
CRON_SECRET=any-long-random-string
```

Generate a `CRON_SECRET` with `openssl rand -hex 32`. The same value must later be stored in Supabase Vault (see §8) so `pg_cron` can authenticate.

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

## 7. Email fetching architecture

Gmail polling and Gemini parsing now live inside this Next.js app, not in Supabase Edge Functions. The Route Handler at `src/app/api/cron/fetch-emails/route.ts`:

1. Validates an `Authorization: Bearer ${CRON_SECRET}` header.
2. Loads every `profiles` row with `gmail_connected = true` (or a single user when `{ user_id }` is posted from the in-app "Fetch now" button).
3. Refreshes each user's Gmail OAuth token, lists statement-like messages, and for each new message calls Gemini and upserts into `bills` / `notifications`.

There is nothing to deploy to Supabase — code ships with the Next.js app (§10). The only Supabase work is enabling `pg_cron` + `pg_net` and scheduling the job (§8).

### 7.1 Smoke test the route locally
```bash
pnpm dev
curl -X POST http://localhost:3000/api/cron/fetch-emails \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```
Expected: `{"success":true,"results":[...]}`. Without the header you should get a `401`.

---

## 8. Schedule the cron job (pg_cron + Vault)

In Supabase Dashboard → SQL Editor, run **once** to store the app URL and shared secret in Vault:

```sql
select vault.create_secret(
  'https://your-production-domain.com/api/cron/fetch-emails',
  'cron_app_url',
  'Public URL of the Next.js cron endpoint'
);

select vault.create_secret(
  'PASTE_THE_SAME_VALUE_AS_CRON_SECRET_ENV',
  'cron_secret',
  'Shared bearer token for the Next.js cron endpoint'
);
```

Then apply the new migration (or paste `supabase/migrations/003_cron_fetch_emails.sql` into the SQL editor):

```bash
supabase db push
```

It enables `pg_cron` + `pg_net` and schedules `fetch-emails-daily` to POST the Next.js route every day at 03:00 UTC, reading both the URL and bearer secret from Vault.

Verify:
```sql
select * from cron.job where jobname = 'fetch-emails-daily';
select * from cron.job_run_details order by start_time desc limit 5;
select status_code, content::text from net._http_response order by created desc limit 5;
```

To update the URL or rotate the secret later:
```sql
select vault.update_secret(
  (select id from vault.decrypted_secrets where name = 'cron_secret'),
  'NEW_SECRET_VALUE'
);
```
Also update `CRON_SECRET` in the hosting env at the same time.

To remove the job entirely:
```sql
select cron.unschedule('fetch-emails-daily');
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
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; used by `/api/cron/fetch-emails`)
   - `GOOGLE_CLIENT_ID` (server-only; refresh-token exchange)
   - `GOOGLE_CLIENT_SECRET` (server-only; refresh-token exchange)
   - `GEMINI_API_KEY` (server-only; statement parsing)
   - `CRON_SECRET` (server-only; must equal the Vault secret of the same name)
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
8. Manually re-invoke the cron route:
   ```bash
   curl -X POST "https://your-production-domain.com/api/cron/fetch-emails" \
     -H "Authorization: Bearer $CRON_SECRET"
   ```
   Check your Next.js host's logs (e.g. Vercel → Deployments → Functions).

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
4. Add monitoring/alerts on `/api/cron/fetch-emails` errors (your host's log explorer + an uptime monitor against the route).
5. Rotate the service role key and `CRON_SECRET` if either was ever exposed (remember to update Vault for `CRON_SECRET`).

---

## 14. Quick reference — what to store securely

| Item | Where used |
|---|---|
| Supabase Project URL | Client + Next.js server |
| Supabase anon key | Client |
| Supabase service role key | Next.js server (`/api/cron/fetch-emails`) |
| Google OAuth Client ID | Supabase Auth provider config + Next.js server (refresh-token exchange) |
| Google OAuth Client Secret | Supabase Auth provider config + Next.js server (refresh-token exchange) |
| Gemini API key | Next.js server (`/api/cron/fetch-emails`) |
| `CRON_SECRET` | Next.js server env + Supabase Vault (`cron_secret`) |
| Production domain | Supabase Auth + Vercel env + Supabase Vault (`cron_app_url`) |

Store these in a password manager. Never commit them to git.

---

## 15. Common issues

1. "Invalid supabaseUrl" at build time → `NEXT_PUBLIC_SUPABASE_URL` missing in Vercel env. Add it and redeploy.
2. Google login loops back to `/login` → Site URL / Redirect URLs misconfigured in Supabase or Google OAuth client.
3. Gmail scope not granted → OAuth consent screen scopes not saved, or user did not approve. Re-run OAuth with `prompt=consent`.
4. `/api/cron/fetch-emails` 401 → `CRON_SECRET` env missing or doesn't match the bearer in the request / Vault secret.
5. pg_cron job not firing → `pg_cron` / `pg_net` extensions not enabled, job not visible in `cron.job` table, or Vault secrets `cron_app_url` / `cron_secret` missing (check `net._http_response` for the last response body).
6. "Fetch statement emails now" returns a server error → `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID/SECRET`, or `GEMINI_API_KEY` not set in your hosting environment.
7. Bills not appearing → check `email_log` table for `processing_status` and `processing_result` JSON for the failure reason.

---

You are now live.
