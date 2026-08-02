
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT
  p.id, p.username, p.full_name, p.title, p.bio,
  p.avatar_url, p.cover_url, p.theme, p.language, p.is_published,
  p.created_at, p.updated_at
FROM public.profiles p
WHERE public.profile_is_visible(p.id);

GRANT SELECT ON public.profiles_public TO anon, authenticated;
