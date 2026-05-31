-- ============================================
-- Add ai_provider to profiles
-- ============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'gemini' NOT NULL;

-- Enforce check constraint for provider options
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_ai_provider_check,
  ADD CONSTRAINT profiles_ai_provider_check CHECK (ai_provider IN ('gemini', 'grok'));

COMMENT ON COLUMN public.profiles.ai_provider IS 'Preferred AI provider for parsing statements (gemini or grok)';
