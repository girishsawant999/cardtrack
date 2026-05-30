-- ============================================
-- Schedule daily Gmail fetch via pg_cron + pg_net
-- ============================================
--
-- This migration replaces the standalone Supabase Edge Functions
-- (`fetch-emails` and `parse-statement`) with a scheduled POST to the
-- Next.js Route Handler at `/api/cron/fetch-emails`.
--
-- PREREQUISITES (must be done once via the Supabase Dashboard SQL editor,
-- before running this migration):
--
--   -- 1. Enable Vault (Project Settings → Vault) if not already on.
--   -- 2. Store the app URL and shared bearer secret in Vault:
--
--   SELECT vault.create_secret(
--     'https://your-app-host.example.com/api/cron/fetch-emails',
--     'cron_app_url',
--     'Public URL of the Next.js cron endpoint'
--   );
--
--   SELECT vault.create_secret(
--     'replace-with-a-long-random-string',
--     'cron_secret',
--     'Shared bearer token for the Next.js cron endpoint'
--   );
--
-- The same `cron_secret` value must be set as the `CRON_SECRET` env var
-- on the Next.js hosting environment.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any previous schedule with the same name so re-running is safe.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fetch-emails-daily') THEN
    PERFORM cron.unschedule('fetch-emails-daily');
  END IF;
END
$$;

-- Daily at 03:00 UTC.
SELECT cron.schedule(
  'fetch-emails-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := (
      SELECT decrypted_secret
      FROM vault.decrypted_secrets
      WHERE name = 'cron_app_url'
    ),
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'cron_secret'
      ),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )
  $$
);
