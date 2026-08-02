
-- 1) Revoke EXECUTE on privileged admin RPCs from authenticated (they self-check has_role, but defense-in-depth).
REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, app_role, boolean) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_ban_user(uuid, boolean, text) FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, app_role, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_ban_user(uuid, boolean, text) TO service_role;

-- has_role & claim_official_card must stay callable by authenticated users (used by RLS + user flow).
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_official_card(text) TO authenticated;

-- 2) Rate limit table (server-only via service role).
CREATE TABLE IF NOT EXISTS public.rate_limits (
  bucket_key text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_key, window_start)
);

GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (bypasses RLS) touches this table.

CREATE INDEX IF NOT EXISTS rate_limits_window_idx ON public.rate_limits (window_start);

-- 3) Atomic check-and-increment. Returns true when the request is ALLOWED.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _bucket text,
  _max integer,
  _window_secs integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _win timestamptz;
  _new_count integer;
BEGIN
  _win := date_trunc('second', now()) - make_interval(secs => (extract(epoch from now())::bigint % _window_secs));

  INSERT INTO public.rate_limits (bucket_key, window_start, count)
  VALUES (_bucket, _win, 1)
  ON CONFLICT (bucket_key, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO _new_count;

  -- Opportunistic cleanup of old windows (older than 1 day).
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day';

  RETURN _new_count <= _max;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;
