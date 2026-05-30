-- ============================================
-- Settings + Gmail OAuth hardening
-- ============================================

-- Store per-user Google OAuth tokens for Gmail sync.
-- Access token is optional and short-lived; refresh token is required for long-term sync.
CREATE TABLE IF NOT EXISTS public.gmail_oauth_tokens (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google',
  refresh_token TEXT,
  access_token TEXT,
  token_type TEXT,
  scope TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gmail_oauth_tokens_provider_check CHECK (provider = 'google')
);

ALTER TABLE public.gmail_oauth_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'gmail_oauth_tokens'
      AND policyname = 'Users can view own gmail tokens'
  ) THEN
    CREATE POLICY "Users can view own gmail tokens"
      ON public.gmail_oauth_tokens
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'gmail_oauth_tokens'
      AND policyname = 'Users can manage own gmail tokens'
  ) THEN
    CREATE POLICY "Users can manage own gmail tokens"
      ON public.gmail_oauth_tokens
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_gmail_oauth_tokens_updated_at
  ON public.gmail_oauth_tokens(updated_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_gmail_oauth_tokens_updated_at'
  ) THEN
    CREATE TRIGGER update_gmail_oauth_tokens_updated_at
      BEFORE UPDATE ON public.gmail_oauth_tokens
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END
$$;
