-- ============================================
-- Add queue management columns to email_log
-- ============================================

ALTER TABLE public.email_log
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS retries INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

-- Comment on columns
COMMENT ON COLUMN public.email_log.error_message IS 'Error message if the processing failed';
COMMENT ON COLUMN public.email_log.retries IS 'Number of retries attempted';
COMMENT ON COLUMN public.email_log.updated_at IS 'Timestamp of the last update';

-- Add updated_at trigger to email_log if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_email_log_updated_at'
  ) THEN
    CREATE TRIGGER update_email_log_updated_at
      BEFORE UPDATE ON public.email_log
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END
$$;
