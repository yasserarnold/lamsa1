DROP POLICY IF EXISTS "Anyone can insert security events" ON public.security_events;

CREATE POLICY "Anyone can insert scoped security events"
ON public.security_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  severity IN ('info','warn','critical')
  AND category IS NOT NULL
  AND length(category) BETWEEN 1 AND 64
  AND action IS NOT NULL
  AND length(action) BETWEEN 1 AND 128
);