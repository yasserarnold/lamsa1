
CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  severity text NOT NULL DEFAULT 'warn' CHECK (severity IN ('info','warn','critical')),
  category text NOT NULL,
  action text NOT NULL,
  actor_id uuid,
  route text,
  user_agent text,
  ip text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security events"
  ON public.security_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX security_events_created_at_idx ON public.security_events (created_at DESC);
CREATE INDEX security_events_category_idx ON public.security_events (category);
CREATE INDEX security_events_severity_idx ON public.security_events (severity);

CREATE OR REPLACE FUNCTION public.log_security_event(
  _severity text,
  _category text,
  _action text,
  _route text DEFAULT NULL,
  _user_agent text DEFAULT NULL,
  _ip text DEFAULT NULL,
  _details jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _severity NOT IN ('info','warn','critical') THEN
    _severity := 'warn';
  END IF;
  INSERT INTO public.security_events (severity, category, action, actor_id, route, user_agent, ip, details)
  VALUES (_severity, _category, _action, auth.uid(), _route, _user_agent, _ip, COALESCE(_details, '{}'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.log_security_event(text, text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, text, text, text, text, text, jsonb) TO anon, authenticated, service_role;
