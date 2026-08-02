
CREATE TYPE public.media_type AS ENUM ('image','video','pdf','file');
CREATE TYPE public.tap_event_type AS ENUM ('view','call','whatsapp','email','website','vcard','share','qr','link');

CREATE TABLE public.profile_themes (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  preset TEXT NOT NULL DEFAULT 'emerald',
  colors JSONB NOT NULL DEFAULT '{"bg":"#f5f5f4","accent":"#0d7a5f","fg":"#0f172a"}'::jsonb,
  fonts JSONB NOT NULL DEFAULT '{"heading":"Space Grotesk","body":"DM Sans"}'::jsonb,
  layout TEXT NOT NULL DEFAULT 'grid',
  custom_css TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profile_themes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_themes TO authenticated;
GRANT ALL ON public.profile_themes TO service_role;
ALTER TABLE public.profile_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "themes public read" ON public.profile_themes FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.is_published = true));
CREATE POLICY "themes owner all" ON public.profile_themes FOR ALL TO authenticated
  USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE TRIGGER trg_profile_themes_updated BEFORE UPDATE ON public.profile_themes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.profile_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.media_type NOT NULL,
  storage_path TEXT NOT NULL,
  title TEXT,
  description TEXT,
  position INT NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_media_profile ON public.profile_media(profile_id, position);
GRANT SELECT ON public.profile_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_media TO authenticated;
GRANT ALL ON public.profile_media TO service_role;
ALTER TABLE public.profile_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media public read" ON public.profile_media FOR SELECT TO anon, authenticated
  USING (is_visible AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.is_published = true));
CREATE POLICY "media owner all" ON public.profile_media FOR ALL TO authenticated
  USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE TRIGGER trg_profile_media_updated BEFORE UPDATE ON public.profile_media
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.taps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_id UUID REFERENCES public.nfc_cards(id) ON DELETE SET NULL,
  ip_hash TEXT,
  country TEXT,
  city TEXT,
  device TEXT,
  os TEXT,
  browser TEXT,
  lang TEXT,
  referrer TEXT,
  utm JSONB,
  visitor_hash TEXT,
  is_returning BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_taps_profile_time ON public.taps(profile_id, created_at DESC);
CREATE INDEX idx_taps_visitor ON public.taps(visitor_hash, profile_id);
CREATE INDEX idx_taps_country ON public.taps(profile_id, country);
GRANT SELECT ON public.taps TO authenticated;
GRANT INSERT ON public.taps TO anon, authenticated;
GRANT ALL ON public.taps TO service_role;
ALTER TABLE public.taps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "taps public insert" ON public.taps FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "taps owner select" ON public.taps FOR SELECT TO authenticated
  USING (auth.uid() = profile_id);
CREATE POLICY "taps admin select" ON public.taps FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.tap_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tap_id UUID REFERENCES public.taps(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type public.tap_event_type NOT NULL,
  link_id UUID REFERENCES public.profile_links(id) ON DELETE SET NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tap_events_profile_time ON public.tap_events(profile_id, created_at DESC);
CREATE INDEX idx_tap_events_type ON public.tap_events(profile_id, event_type);
GRANT SELECT ON public.tap_events TO authenticated;
GRANT INSERT ON public.tap_events TO anon, authenticated;
GRANT ALL ON public.tap_events TO service_role;
ALTER TABLE public.tap_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tap_events public insert" ON public.tap_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "tap_events owner select" ON public.tap_events FOR SELECT TO authenticated
  USING (auth.uid() = profile_id);
CREATE POLICY "tap_events admin select" ON public.tap_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "media bucket owner read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "media bucket owner write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "media bucket owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "media bucket owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
