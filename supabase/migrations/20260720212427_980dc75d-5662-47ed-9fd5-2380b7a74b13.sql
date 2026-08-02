GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, text, text, text, text, text, jsonb) TO anon, authenticated, service_role;
-- profile_is_visible is used by the profiles_public view; anon must be able to evaluate it.
GRANT EXECUTE ON FUNCTION public.profile_is_visible(uuid) TO anon, authenticated, service_role;