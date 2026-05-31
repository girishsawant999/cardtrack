-- ============================================
-- Add pdf_passwords to profiles
-- Stores user-defined passwords/combinations
-- to decrypt statement PDFs.
-- ============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pdf_passwords TEXT[] DEFAULT '{}'::TEXT[] NOT NULL;

COMMENT ON COLUMN public.profiles.pdf_passwords
  IS 'User-defined passwords/combinations to decrypt statement PDFs';
