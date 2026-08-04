-- Additive UPDATE RLS policy for thread_follows (Slice 2 correction).
-- Slice 1 (20260803000000) enabled RLS with SELECT/INSERT/DELETE policies only;
-- the Slice 2 ?/preference action (setFollowPreference -> .update({notify_in_app}))
-- was denied by RLS deny-by-default (42501). This migration adds the missing
-- owner-scoped UPDATE policy so a user can change only their own follow rows.
--
-- Policy is owner-only in both USING (which rows are updateable) and WITH CHECK
-- (rows may not be reassigned to another user), mirroring the existing
-- SELECT/INSERT/DELETE owner confinement. Columns are otherwise unrestricted
-- because the follow row is fully owned by the user; no FOR ALL policy is added.

CREATE POLICY "Seguidores actualizan sus propios follows"
  ON public.thread_follows
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
