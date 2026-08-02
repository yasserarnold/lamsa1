CREATE POLICY "Anyone can insert security events"
ON public.security_events
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

GRANT INSERT ON public.security_events TO anon, authenticated;