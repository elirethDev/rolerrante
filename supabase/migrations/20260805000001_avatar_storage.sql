-- Avatar storage: bucket + RLS for direct avatar upload (REQ-AVUP-04).
-- ---------------------------------------------------------------------------
-- Greenfield on the Supabase side: no storage bucket existed before this change.
-- The `avatars` bucket is PUBLIC so rendered avatars load for every visitor
-- without signed URLs; write safety comes from owner-scoped policies, not
-- bucket privacy (design decision: public read + path-based write ownership).
--
-- Path scheme (bucket root = `avatars`):
--   profile   -> avatars/{user_id}/{filename}.webp
--   character -> char-avatars/{character_id}/{filename}.webp
--
-- Backstops: bucket-level file_size_limit (250KB) towers above the app-level
-- 150KB cap (AVATAR_MAX_BYTES) and allowed_mime_types only admits image/webp;
-- the authoritative byte-level validation still lives server-side.

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

UPDATE storage.buckets
SET file_size_limit = 250000,
    allowed_mime_types = ARRAY['image/webp']
WHERE id = 'avatars';

-- Public read: any visitor can fetch avatar bytes (REQ-AVUP-04 public read).
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'avatars');

-- Profile avatars: owner may create/replace/delete only under avatars/{own-id}/.
-- foldername(name) returns the folder segments (1-indexed array), so [2] is the
-- owner id that must match the session user.
CREATE POLICY "avatars_owner_profile" ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Character avatars: only the character's owner (player_id) may write under
-- char-avatars/{character_id}/. Staff keep the same edit rights they already
-- have on the ficha (isGMOrAdmin), so a GM fixing a ficha avatar still works.
CREATE POLICY "avatars_owner_character" ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'char-avatars'
    AND (
      EXISTS (
        SELECT 1 FROM public.characters c
        WHERE c.id = (storage.foldername(name))[2]::uuid
          AND (c.player_id = auth.uid() OR auth.uid() IN (
            SELECT pr.id FROM public.profiles pr
            WHERE pr.role IN ('gm', 'admin')
          ))
      )
    )
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'char-avatars'
    AND (
      EXISTS (
        SELECT 1 FROM public.characters c
        WHERE c.id = (storage.foldername(name))[2]::uuid
          AND (c.player_id = auth.uid() OR auth.uid() IN (
            SELECT pr.id FROM public.profiles pr
            WHERE pr.role IN ('gm', 'admin')
          ))
      )
    )
  );

-- ===========================================================================
-- Rollback (down-migration)
-- ===========================================================================
-- DROP POLICY IF EXISTS avatars_owner_character ON storage.objects;
-- DROP POLICY IF EXISTS avatars_owner_profile ON storage.objects;
-- DROP POLICY IF EXISTS avatars_public_read ON storage.objects;
-- DELETE FROM storage.objects WHERE bucket_id = 'avatars';
-- DELETE FROM storage.buckets WHERE id = 'avatars';
