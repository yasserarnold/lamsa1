
DROP POLICY IF EXISTS "taps public insert" ON public.taps;
CREATE POLICY "taps insert for published" ON public.taps FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.is_published = true));

DROP POLICY IF EXISTS "tap_events public insert" ON public.tap_events;
CREATE POLICY "tap_events insert for published" ON public.tap_events FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.is_published = true));
