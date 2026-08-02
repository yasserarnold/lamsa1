DROP POLICY IF EXISTS "Anyone can insert scoped security events" ON public.security_events;
CREATE POLICY "Anyone can insert scoped security events"
ON public.security_events FOR INSERT TO anon, authenticated
WITH CHECK (
  (actor_id IS NULL OR actor_id = auth.uid())
  AND severity IN ('info','warn','critical')
  AND category IS NOT NULL AND length(category) BETWEEN 1 AND 64
  AND action IS NOT NULL AND length(action) BETWEEN 1 AND 128
  AND (route IS NULL OR length(route) <= 512)
  AND (user_agent IS NULL OR length(user_agent) <= 512)
);

DROP POLICY IF EXISTS "leads_public_insert" ON public.leads;
CREATE POLICY "leads_public_insert"
ON public.leads FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = leads.profile_id AND p.is_published = true AND p.is_banned = false)
  AND length(btrim(name)) BETWEEN 2 AND 100
  AND length(btrim(mobile)) BETWEEN 6 AND 20
  AND btrim(mobile) ~ '^[+0-9][0-9 ()-]{5,19}$'
  AND (interest IS NULL OR length(interest) <= 500)
  AND (source_card_uid IS NULL OR length(source_card_uid) <= 32)
  AND public.check_rate_limit('leads:' || leads.profile_id::text, 5, 60)
);