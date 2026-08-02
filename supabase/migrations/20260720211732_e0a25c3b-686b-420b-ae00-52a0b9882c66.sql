-- Revoke anon EXECUTE from SECURITY DEFINER functions that require authentication
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.claim_official_card(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_ban_user(uuid, boolean, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, app_role, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.profile_is_visible(uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_official_card(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_ban_user(uuid, boolean, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, app_role, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.profile_is_visible(uuid) TO authenticated, service_role;

-- check_rate_limit and log_security_event remain callable by anon (needed for public lead form + client-side security logging)