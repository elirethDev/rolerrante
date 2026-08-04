-- Additive UPDATE RLS policy for notifications (Slice 3 — bell + center).
-- Slice 1 (20260803000000) enabled RLS on notifications with a SELECT policy
-- only. Without an UPDATE policy the notification center could never mark its
-- rows read (deny-by-default 42501), so the bell's unread count would never
-- clear. This migration adds the missing recipient-only UPDATE policy so a
-- user can set read_at=now() on their own notifications.
--
-- Policy is recipient-only in both USING (which rows are updateable) and
-- WITH CHECK (rows may not be reassigned to another user), mirroring the
-- existing SELECT owner confinement on notifications. Columns are otherwise
-- unrestricted because the notification row belongs to the recipient.

CREATE POLICY "Destinatario marca leídas sus notificaciones"
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
