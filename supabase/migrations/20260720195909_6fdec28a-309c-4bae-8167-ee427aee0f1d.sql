
-- Tighten EXECUTE privileges on SECURITY DEFINER and trigger helpers.
REVOKE EXECUTE ON FUNCTION public.admin_ban_user(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_official_card(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

-- Trigger helpers: never called via RPC, revoke from PUBLIC entirely.
REVOKE EXECUTE ON FUNCTION public.normalize_card_uid() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
