
-- Fix Security Definer View lint: switch to invoker.
ALTER VIEW public.profiles_public SET (security_invoker = on);

-- Restore an anon SELECT policy on profiles, but limit reachable columns
-- via column-level GRANTs so moderation fields cannot leak.
CREATE POLICY profiles_public_read_published
ON public.profiles
FOR SELECT
TO anon
USING (is_published = true AND is_banned = false);

GRANT SELECT
  (id, username, full_name, title, bio, avatar_url, cover_url,
   theme, language, is_published, created_at, updated_at)
ON public.profiles TO anon;
