-- Fix search_path on trigger functions
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.normalize_card_uid() SET search_path = public;

-- Restrict has_role to authenticated only (revoke from anon and public)
REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

-- Restrict claim_official_card
REVOKE ALL ON FUNCTION public.claim_official_card(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_official_card(TEXT) TO authenticated;

-- handle_new_user is trigger-only, revoke direct execute
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;