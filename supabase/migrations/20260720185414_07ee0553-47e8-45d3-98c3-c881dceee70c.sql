-- Tighten storage read for avatars/covers to only expose images of published, non-banned profiles.
-- The image URL path is `<owner_uid>/...`, so we join on storage.foldername(name)[1].
DROP POLICY IF EXISTS avatars_public_read_row ON storage.objects;

CREATE POLICY avatars_public_read_row ON storage.objects
FOR SELECT
USING (
  bucket_id = ANY (ARRAY['avatars'::text, 'covers'::text])
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.is_published = true
      AND p.is_banned = false
  )
);