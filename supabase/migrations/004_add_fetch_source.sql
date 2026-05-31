-- ============================================
-- Add email_last_fetch_source to profiles
-- Tracks whether the last sync was triggered by
-- the daily cron job or a manual user action.
-- ============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_last_fetch_source TEXT DEFAULT NULL;

COMMENT ON COLUMN public.profiles.email_last_fetch_source
  IS 'Source of the last email fetch: "cron" or "user"';
