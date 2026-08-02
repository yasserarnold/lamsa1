
-- 1) Helper: public visibility check (SECURITY DEFINER) so downstream policies
--    don't require anon to SELECT public.profiles directly.
CREATE OR REPLACE FUNCTION public.profile_is_visible(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _profile_id
      AND is_published = true
      AND is_banned = false
  );
$$;

REVOKE EXECUTE ON FUNCTION public.profile_is_visible(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_is_visible(uuid) TO anon, authenticated, service_role;

-- 2) Public safe view — excludes moderation columns (is_banned, banned_at, ban_reason).
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = off) AS
SELECT
  id, username, full_name, title, bio,
  avatar_url, cover_url, theme, language, is_published,
  created_at, updated_at
FROM public.profiles
WHERE is_published = true AND is_banned = false;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- 3) Remove direct anon read of the base profiles table so moderation columns
--    can no longer be pulled via the Data API. Authenticated owner/admin reads
--    remain via existing policies.
DROP POLICY IF EXISTS profiles_public_read_published ON public.profiles;
REVOKE SELECT ON public.profiles FROM anon;

-- 4) Rewrite the storage SELECT policy to use the SECURITY DEFINER helper
--    (so avatars/covers keep working for anon without SELECT on profiles).
DROP POLICY IF EXISTS avatars_public_read_row ON storage.objects;
CREATE POLICY avatars_public_read_row
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = ANY (ARRAY['avatars'::text, 'covers'::text])
  AND public.profile_is_visible(((storage.foldername(name))[1])::uuid)
);
