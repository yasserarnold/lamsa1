CREATE TABLE public.app_settings (
  id boolean PRIMARY KEY DEFAULT true,
  site_title text NOT NULL DEFAULT 'لمسة',
  site_description text NOT NULL DEFAULT '',
  default_language text NOT NULL DEFAULT 'ar',
  footer_note text NOT NULL DEFAULT '',
  maintenance_mode boolean NOT NULL DEFAULT false,
  show_public_profiles boolean NOT NULL DEFAULT true,
  enable_leads_form boolean NOT NULL DEFAULT true,
  show_qr_code boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_singleton CHECK (id = true)
);

GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings_public_read" ON public.app_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "app_settings_admin_insert" ON public.app_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "app_settings_admin_update" ON public.app_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER app_settings_set_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.app_settings (id) VALUES (true);