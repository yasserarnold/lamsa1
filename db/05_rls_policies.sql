-- Row Level Security
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfc_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tap_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY admin_actions_admin_insert ON public.admin_actions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) AND (actor_id = auth.uid())));
CREATE POLICY admin_actions_admin_read ON public.admin_actions AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all card events" ON public.card_events AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners insert their card events" ON public.card_events AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((profile_id = auth.uid()));
CREATE POLICY "Owners read their card events" ON public.card_events AS PERMISSIVE FOR SELECT TO authenticated USING ((profile_id = auth.uid()));
CREATE POLICY leads_owner_delete ON public.leads AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid() = profile_id));
CREATE POLICY leads_owner_read ON public.leads AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = profile_id));
CREATE POLICY leads_public_insert ON public.leads AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = leads.profile_id) AND (p.is_published = true) AND (p.is_banned = false)))) AND ((length(btrim(name)) >= 2) AND (length(btrim(name)) <= 100)) AND ((length(btrim(mobile)) >= 6) AND (length(btrim(mobile)) <= 20)) AND (btrim(mobile) ~ '^[+0-9][0-9 ()-]{5,19}$'::text) AND ((interest IS NULL) OR (length(interest) <= 500)) AND ((source_card_uid IS NULL) OR (length(source_card_uid) <= 32)) AND check_rate_limit(('leads:'::text || (profile_id)::text), 5, 60)));
CREATE POLICY nfc_cards_admin_all ON public.nfc_cards AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY nfc_cards_read_own ON public.nfc_cards AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid() = profile_id) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY profile_links_owner_all ON public.profile_links AS PERMISSIVE FOR ALL TO authenticated USING ((auth.uid() = profile_id)) WITH CHECK ((auth.uid() = profile_id));
CREATE POLICY profile_links_public_read_visible ON public.profile_links AS PERMISSIVE FOR SELECT TO anon, authenticated USING (((is_visible = true) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = profile_links.profile_id) AND (p.is_published = true))))));
CREATE POLICY "media owner all" ON public.profile_media AS PERMISSIVE FOR ALL TO authenticated USING ((auth.uid() = profile_id)) WITH CHECK ((auth.uid() = profile_id));
CREATE POLICY "media public read" ON public.profile_media AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((is_visible AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = profile_media.profile_id) AND (p.is_published = true))))));
CREATE POLICY "themes owner all" ON public.profile_themes AS PERMISSIVE FOR ALL TO authenticated USING ((auth.uid() = profile_id)) WITH CHECK ((auth.uid() = profile_id));
CREATE POLICY "themes public read" ON public.profile_themes AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = profile_themes.profile_id) AND (p.is_published = true)))));
CREATE POLICY profiles_admin_all ON public.profiles AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY profiles_owner_insert ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));
CREATE POLICY profiles_owner_read ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = id));
CREATE POLICY profiles_owner_update ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));
CREATE POLICY profiles_public_view_read ON public.profiles AS PERMISSIVE FOR SELECT TO anon USING (((is_published = true) AND (is_banned = false)));
CREATE POLICY "Admins can view security events" ON public.security_events AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can insert scoped security events" ON public.security_events AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK ((((actor_id IS NULL) OR (actor_id = auth.uid())) AND (severity = ANY (ARRAY['info'::text, 'warn'::text, 'critical'::text])) AND (category IS NOT NULL) AND ((length(category) >= 1) AND (length(category) <= 64)) AND (action IS NOT NULL) AND ((length(action) >= 1) AND (length(action) <= 128)) AND ((route IS NULL) OR (length(route) <= 512)) AND ((user_agent IS NULL) OR (length(user_agent) <= 512))));
CREATE POLICY "tap_events admin select" ON public.tap_events AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "tap_events insert for published" ON public.tap_events AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = tap_events.profile_id) AND (p.is_published = true)))));
CREATE POLICY "tap_events owner select" ON public.tap_events AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = profile_id));
CREATE POLICY "taps admin select" ON public.taps AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "taps insert for published" ON public.taps AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = taps.profile_id) AND (p.is_published = true)))));
CREATE POLICY "taps owner select" ON public.taps AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = profile_id));
CREATE POLICY user_roles_read_own ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
