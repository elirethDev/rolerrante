-- ===========================================================================
-- Terms-of-service consent (OD register design)
--
-- A nullable timestamptz on profiles records WHEN a user accepted the
-- community rules, without grandfathering existing accounts retroactively:
-- NULL means "never accepted", a value means consent is on record. New
-- signups store the accepted-at timestamp via handle_new_user (SECURITY
-- DEFINER), which reads it from auth.users raw_user_meta_data (sent by the
-- app in signUp options.data).
--
-- The init schema is append-only, so it is left untouched: we CREATE OR
-- REPLACE the trigger function with the extra column and re-create the
-- trigger in this migration.
--
-- The column is intentionally NOT part of the profiles UPDATE column grant:
-- users cannot backdate or clear their own consent.
-- ===========================================================================
ALTER TABLE public.profiles ADD COLUMN terms_accepted_at timestamptz;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, role, terms_accepted_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'pendiente',
    (NEW.raw_user_meta_data->>'terms_accepted_at')::timestamptz
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===========================================================================
-- Rollback (down-migration)
-- ===========================================================================
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- -- Restore the trigger from the init schema definition (20260731000000).
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS terms_accepted_at;
