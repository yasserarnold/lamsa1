
-- Remove any anon direct storage read; images now flow only via signed URLs
-- issued by the server (service role).
DROP POLICY IF EXISTS avatars_public_read_row ON storage.objects;

-- Remove anon direct SELECT on profiles; anon must read through profiles_public.
DROP POLICY IF EXISTS profiles_public_read_published ON public.profiles;
REVOKE SELECT ON public.profiles FROM anon;

-- profiles_public was created with security_invoker=on, so we need anon
-- to be able to reach the base rows via the view. Grant a narrow SELECT
-- policy scoped to published+non-banned rows and column-level grants.
CREATE POLICY profiles_public_view_read
ON public.profiles
FOR SELECT
TO anon
USING (is_published = true AND is_banned = false);

-- Column-level grants: moderation columns stay out of reach for anon.
GRANT SELECT
  (id, username, full_name, title, bio, avatar_url, cover_url,
   theme, language, is_published, created_at, updated_at)
ON public.profiles TO anon;
