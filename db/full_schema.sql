-- Enum types (public)
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.card_event_type AS ENUM ('activated', 'written', 'deactivated', 'deleted', 'registered');
CREATE TYPE public.card_status AS ENUM ('unassigned', 'active', 'disabled');
CREATE TYPE public.link_type AS ENUM ('url', 'email', 'phone', 'whatsapp', 'instapay', 'social', 'messenger', 'website', 'instagram', 'x', 'linkedin', 'facebook', 'tiktok', 'youtube', 'github', 'telegram', 'snapchat', 'map', 'custom');
CREATE TYPE public.media_type AS ENUM ('image', 'video', 'pdf', 'file');
CREATE TYPE public.tap_event_type AS ENUM ('view', 'call', 'whatsapp', 'email', 'website', 'vcard', 'share', 'qr', 'link');
-- Tables
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.card_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  card_id uuid,
  profile_id uuid NOT NULL,
  card_uid text NOT NULL,
  event_type card_event_type NOT NULL,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  name text NOT NULL,
  mobile text NOT NULL,
  interest text,
  source_card_uid text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.nfc_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  card_uid text NOT NULL,
  profile_id uuid,
  status card_status NOT NULL DEFAULT 'unassigned'::card_status,
  is_official boolean NOT NULL DEFAULT false,
  activated_at timestamp with time zone,
  last_written_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.profile_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  type link_type NOT NULL,
  label text NOT NULL,
  value text NOT NULL,
  "position" integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.profile_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  type media_type NOT NULL,
  storage_path text NOT NULL,
  title text,
  description text,
  "position" integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.profile_themes (
  profile_id uuid NOT NULL,
  preset text NOT NULL DEFAULT 'emerald'::text,
  colors jsonb NOT NULL DEFAULT '{"bg": "#f5f5f4", "fg": "#0f172a", "accent": "#0d7a5f"}'::jsonb,
  fonts jsonb NOT NULL DEFAULT '{"body": "DM Sans", "heading": "Space Grotesk"}'::jsonb,
  layout text NOT NULL DEFAULT 'grid'::text,
  custom_css text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  username text,
  full_name text,
  title text,
  bio text,
  avatar_url text,
  cover_url text,
  theme text NOT NULL DEFAULT 'default'::text,
  language text NOT NULL DEFAULT 'ar'::text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_banned boolean NOT NULL DEFAULT false,
  banned_at timestamp with time zone,
  ban_reason text
);
CREATE TABLE IF NOT EXISTS public.rate_limits (
  bucket_key text NOT NULL,
  window_start timestamp with time zone NOT NULL,
  count integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  severity text NOT NULL DEFAULT 'warn'::text,
  category text NOT NULL,
  action text NOT NULL,
  actor_id uuid,
  route text,
  user_agent text,
  ip text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS public.tap_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tap_id uuid,
  profile_id uuid NOT NULL,
  event_type tap_event_type NOT NULL,
  link_id uuid,
  meta jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.taps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  card_id uuid,
  ip_hash text,
  country text,
  city text,
  device text,
  os text,
  browser text,
  lang text,
  referrer text,
  utm jsonb,
  visitor_hash text,
  is_returning boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.admin_actions ADD CONSTRAINT admin_actions_pkey PRIMARY KEY (id);
ALTER TABLE public.admin_actions ADD CONSTRAINT admin_actions_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.card_events ADD CONSTRAINT card_events_pkey PRIMARY KEY (id);
ALTER TABLE public.card_events ADD CONSTRAINT card_events_card_id_fkey FOREIGN KEY (card_id) REFERENCES nfc_cards(id) ON DELETE SET NULL;
ALTER TABLE public.card_events ADD CONSTRAINT card_events_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.leads ADD CONSTRAINT leads_pkey PRIMARY KEY (id);
ALTER TABLE public.leads ADD CONSTRAINT leads_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.leads ADD CONSTRAINT leads_interest_len CHECK (((interest IS NULL) OR (char_length(interest) <= 300)));
ALTER TABLE public.leads ADD CONSTRAINT leads_mobile_len CHECK (((char_length(mobile) >= 5) AND (char_length(mobile) <= 32)));
ALTER TABLE public.leads ADD CONSTRAINT leads_name_len CHECK (((char_length(name) >= 1) AND (char_length(name) <= 120)));
ALTER TABLE public.nfc_cards ADD CONSTRAINT nfc_cards_card_uid_key UNIQUE (card_uid);
ALTER TABLE public.nfc_cards ADD CONSTRAINT nfc_cards_pkey PRIMARY KEY (id);
ALTER TABLE public.nfc_cards ADD CONSTRAINT nfc_cards_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.profile_links ADD CONSTRAINT profile_links_pkey PRIMARY KEY (id);
ALTER TABLE public.profile_links ADD CONSTRAINT profile_links_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.profile_media ADD CONSTRAINT profile_media_pkey PRIMARY KEY (id);
ALTER TABLE public.profile_media ADD CONSTRAINT profile_media_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.profile_themes ADD CONSTRAINT profile_themes_pkey PRIMARY KEY (profile_id);
ALTER TABLE public.profile_themes ADD CONSTRAINT profile_themes_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT username_format CHECK (((username IS NULL) OR (username ~ '^[a-z0-9_-]{3,32}$'::text)));
ALTER TABLE public.rate_limits ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (bucket_key, window_start);
ALTER TABLE public.security_events ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);
ALTER TABLE public.security_events ADD CONSTRAINT security_events_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warn'::text, 'critical'::text])));
ALTER TABLE public.tap_events ADD CONSTRAINT tap_events_pkey PRIMARY KEY (id);
ALTER TABLE public.tap_events ADD CONSTRAINT tap_events_link_id_fkey FOREIGN KEY (link_id) REFERENCES profile_links(id) ON DELETE SET NULL;
ALTER TABLE public.tap_events ADD CONSTRAINT tap_events_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.tap_events ADD CONSTRAINT tap_events_tap_id_fkey FOREIGN KEY (tap_id) REFERENCES taps(id) ON DELETE CASCADE;
ALTER TABLE public.taps ADD CONSTRAINT taps_pkey PRIMARY KEY (id);
ALTER TABLE public.taps ADD CONSTRAINT taps_card_id_fkey FOREIGN KEY (card_id) REFERENCES nfc_cards(id) ON DELETE SET NULL;
ALTER TABLE public.taps ADD CONSTRAINT taps_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX idx_admin_actions_created ON public.admin_actions USING btree (created_at DESC);
CREATE INDEX idx_admin_actions_created_at ON public.admin_actions USING btree (created_at DESC);
CREATE INDEX idx_admin_actions_target ON public.admin_actions USING btree (target_type, target_id);
CREATE INDEX idx_card_events_card ON public.card_events USING btree (card_id, created_at DESC);
CREATE INDEX idx_card_events_profile ON public.card_events USING btree (profile_id, created_at DESC);
CREATE INDEX idx_card_events_profile_created ON public.card_events USING btree (profile_id, created_at DESC);
CREATE INDEX idx_leads_profile ON public.leads USING btree (profile_id, created_at DESC);
CREATE INDEX idx_leads_profile_created ON public.leads USING btree (profile_id, created_at DESC);
CREATE INDEX idx_nfc_cards_official ON public.nfc_cards USING btree (is_official, profile_id);
CREATE INDEX idx_nfc_cards_profile ON public.nfc_cards USING btree (profile_id) WHERE (profile_id IS NOT NULL);
CREATE INDEX idx_nfc_cards_profile_status ON public.nfc_cards USING btree (profile_id, status);
CREATE INDEX idx_profile_links_profile ON public.profile_links USING btree (profile_id, "position");
CREATE INDEX idx_profile_links_profile_position ON public.profile_links USING btree (profile_id, "position");
CREATE INDEX idx_media_profile ON public.profile_media USING btree (profile_id, "position");
CREATE INDEX idx_profiles_published ON public.profiles USING btree (is_published) WHERE (is_published = true);
CREATE INDEX idx_profiles_username ON public.profiles USING btree (username) WHERE (username IS NOT NULL);
CREATE INDEX idx_profiles_username_published ON public.profiles USING btree (username) WHERE (is_published = true);
CREATE INDEX rate_limits_window_idx ON public.rate_limits USING btree (window_start);
CREATE INDEX security_events_category_idx ON public.security_events USING btree (category);
CREATE INDEX security_events_created_at_idx ON public.security_events USING btree (created_at DESC);
CREATE INDEX security_events_severity_idx ON public.security_events USING btree (severity);
CREATE INDEX idx_tap_events_profile_time ON public.tap_events USING btree (profile_id, created_at DESC);
CREATE INDEX idx_tap_events_type ON public.tap_events USING btree (profile_id, event_type);
CREATE INDEX idx_taps_country ON public.taps USING btree (profile_id, country);
CREATE INDEX idx_taps_profile_time ON public.taps USING btree (profile_id, created_at DESC);
CREATE INDEX idx_taps_visitor ON public.taps USING btree (visitor_hash, profile_id);
-- Functions (public)
CREATE OR REPLACE FUNCTION public.admin_ban_user(_user_id uuid, _ban boolean, _reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'صلاحيات غير كافية';
  END IF;
  IF _user_id = auth.uid() AND _ban THEN
    RAISE EXCEPTION 'لا يمكنك حظر حسابك';
  END IF;
  UPDATE public.profiles
  SET is_banned = _ban,
      banned_at = CASE WHEN _ban THEN now() ELSE NULL END,
      ban_reason = CASE WHEN _ban THEN _reason ELSE NULL END
  WHERE id = _user_id;

  INSERT INTO public.admin_actions (actor_id, action, target_type, target_id, metadata)
  VALUES (
    auth.uid(),
    CASE WHEN _ban THEN 'user_banned' ELSE 'user_unbanned' END,
    'user',
    _user_id::text,
    jsonb_build_object('reason', _reason)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_set_user_role(_user_id uuid, _role app_role, _grant boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'صلاحيات غير كافية';
  END IF;
  IF _user_id = auth.uid() AND _role = 'admin' AND NOT _grant THEN
    RAISE EXCEPTION 'لا يمكنك إزالة صلاحيتك كمسؤول';
  END IF;
  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role;
  END IF;

  INSERT INTO public.admin_actions (actor_id, action, target_type, target_id, metadata)
  VALUES (
    auth.uid(),
    CASE WHEN _grant THEN 'role_granted' ELSE 'role_revoked' END,
    'user',
    _user_id::text,
    jsonb_build_object('role', _role::text)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_rate_limit(_bucket text, _max integer, _window_secs integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.claim_official_card(_uid text)
 RETURNS nfc_cards
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _normalized TEXT;
  _card public.nfc_cards;
  _uid_user UUID;
BEGIN
  _uid_user := auth.uid();
  IF _uid_user IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  _normalized := UPPER(regexp_replace(COALESCE(_uid, ''), '[^0-9A-Fa-f]', '', 'g'));
  IF _normalized = '' OR _normalized !~ '^[0-9A-F]{8,32}$' THEN
    RAISE EXCEPTION 'صيغة UID غير صحيحة';
  END IF;

  SELECT * INTO _card FROM public.nfc_cards WHERE card_uid = _normalized;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'البطاقة غير موجودة';
  END IF;

  IF NOT _card.is_official THEN
    RAISE EXCEPTION 'هذه البطاقة غير رسمية';
  END IF;

  IF _card.profile_id IS NOT NULL AND _card.profile_id <> _uid_user THEN
    RAISE EXCEPTION 'البطاقة مربوطة بمستخدم آخر';
  END IF;

  UPDATE public.nfc_cards
  SET profile_id = _uid_user,
      status = 'active',
      activated_at = COALESCE(activated_at, now())
  WHERE id = _card.id
  RETURNING * INTO _card;

  RETURN _card;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$
;

CREATE OR REPLACE FUNCTION public.log_security_event(_severity text, _category text, _action text, _route text DEFAULT NULL::text, _user_agent text DEFAULT NULL::text, _ip text DEFAULT NULL::text, _details jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF _severity NOT IN ('info','warn','critical') THEN
    _severity := 'warn';
  END IF;
  INSERT INTO public.security_events (severity, category, action, actor_id, route, user_agent, ip, details)
  VALUES (_severity, _category, _action, auth.uid(), _route, _user_agent, _ip, COALESCE(_details, '{}'::jsonb));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.normalize_card_uid()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.card_uid IS NOT NULL THEN
    NEW.card_uid = UPPER(regexp_replace(NEW.card_uid, '[^0-9A-Fa-f]', '', 'g'));
    IF NEW.card_uid !~ '^[0-9A-F]{8,32}$' THEN
      RAISE EXCEPTION 'card_uid يجب أن يكون Hex بطول 8 إلى 32 حرف';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.profile_is_visible(_profile_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _profile_id
      AND is_published = true
      AND is_banned = false
  );
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

-- Triggers (public)
CREATE TRIGGER trg_nfc_cards_updated_at BEFORE UPDATE ON public.nfc_cards FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_normalize_card_uid BEFORE INSERT OR UPDATE OF card_uid ON public.nfc_cards FOR EACH ROW EXECUTE FUNCTION normalize_card_uid();
CREATE TRIGGER trg_profile_links_updated_at BEFORE UPDATE ON public.profile_links FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profile_media_updated BEFORE UPDATE ON public.profile_media FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profile_themes_updated BEFORE UPDATE ON public.profile_themes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
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
-- Table grants
GRANT DELETE ON public.admin_actions TO anon;
GRANT INSERT ON public.admin_actions TO anon;
GRANT SELECT ON public.admin_actions TO anon;
GRANT UPDATE ON public.admin_actions TO anon;
GRANT DELETE ON public.admin_actions TO authenticated;
GRANT INSERT ON public.admin_actions TO authenticated;
GRANT SELECT ON public.admin_actions TO authenticated;
GRANT UPDATE ON public.admin_actions TO authenticated;
GRANT DELETE ON public.admin_actions TO service_role;
GRANT INSERT ON public.admin_actions TO service_role;
GRANT SELECT ON public.admin_actions TO service_role;
GRANT UPDATE ON public.admin_actions TO service_role;
GRANT DELETE ON public.card_events TO anon;
GRANT INSERT ON public.card_events TO anon;
GRANT SELECT ON public.card_events TO anon;
GRANT UPDATE ON public.card_events TO anon;
GRANT DELETE ON public.card_events TO authenticated;
GRANT INSERT ON public.card_events TO authenticated;
GRANT SELECT ON public.card_events TO authenticated;
GRANT UPDATE ON public.card_events TO authenticated;
GRANT DELETE ON public.card_events TO service_role;
GRANT INSERT ON public.card_events TO service_role;
GRANT SELECT ON public.card_events TO service_role;
GRANT UPDATE ON public.card_events TO service_role;
GRANT DELETE ON public.leads TO anon;
GRANT INSERT ON public.leads TO anon;
GRANT SELECT ON public.leads TO anon;
GRANT UPDATE ON public.leads TO anon;
GRANT DELETE ON public.leads TO authenticated;
GRANT INSERT ON public.leads TO authenticated;
GRANT SELECT ON public.leads TO authenticated;
GRANT UPDATE ON public.leads TO authenticated;
GRANT DELETE ON public.leads TO service_role;
GRANT INSERT ON public.leads TO service_role;
GRANT SELECT ON public.leads TO service_role;
GRANT UPDATE ON public.leads TO service_role;
GRANT DELETE ON public.nfc_cards TO anon;
GRANT INSERT ON public.nfc_cards TO anon;
GRANT SELECT ON public.nfc_cards TO anon;
GRANT UPDATE ON public.nfc_cards TO anon;
GRANT DELETE ON public.nfc_cards TO authenticated;
GRANT INSERT ON public.nfc_cards TO authenticated;
GRANT SELECT ON public.nfc_cards TO authenticated;
GRANT UPDATE ON public.nfc_cards TO authenticated;
GRANT DELETE ON public.nfc_cards TO service_role;
GRANT INSERT ON public.nfc_cards TO service_role;
GRANT SELECT ON public.nfc_cards TO service_role;
GRANT UPDATE ON public.nfc_cards TO service_role;
GRANT DELETE ON public.profile_links TO anon;
GRANT INSERT ON public.profile_links TO anon;
GRANT SELECT ON public.profile_links TO anon;
GRANT UPDATE ON public.profile_links TO anon;
GRANT DELETE ON public.profile_links TO authenticated;
GRANT INSERT ON public.profile_links TO authenticated;
GRANT SELECT ON public.profile_links TO authenticated;
GRANT UPDATE ON public.profile_links TO authenticated;
GRANT DELETE ON public.profile_links TO service_role;
GRANT INSERT ON public.profile_links TO service_role;
GRANT SELECT ON public.profile_links TO service_role;
GRANT UPDATE ON public.profile_links TO service_role;
GRANT DELETE ON public.profile_media TO anon;
GRANT INSERT ON public.profile_media TO anon;
GRANT SELECT ON public.profile_media TO anon;
GRANT UPDATE ON public.profile_media TO anon;
GRANT DELETE ON public.profile_media TO authenticated;
GRANT INSERT ON public.profile_media TO authenticated;
GRANT SELECT ON public.profile_media TO authenticated;
GRANT UPDATE ON public.profile_media TO authenticated;
GRANT DELETE ON public.profile_media TO service_role;
GRANT INSERT ON public.profile_media TO service_role;
GRANT SELECT ON public.profile_media TO service_role;
GRANT UPDATE ON public.profile_media TO service_role;
GRANT DELETE ON public.profile_themes TO anon;
GRANT INSERT ON public.profile_themes TO anon;
GRANT SELECT ON public.profile_themes TO anon;
GRANT UPDATE ON public.profile_themes TO anon;
GRANT DELETE ON public.profile_themes TO authenticated;
GRANT INSERT ON public.profile_themes TO authenticated;
GRANT SELECT ON public.profile_themes TO authenticated;
GRANT UPDATE ON public.profile_themes TO authenticated;
GRANT DELETE ON public.profile_themes TO service_role;
GRANT INSERT ON public.profile_themes TO service_role;
GRANT SELECT ON public.profile_themes TO service_role;
GRANT UPDATE ON public.profile_themes TO service_role;
GRANT DELETE ON public.profiles TO anon;
GRANT INSERT ON public.profiles TO anon;
GRANT SELECT ON public.profiles TO anon;
GRANT UPDATE ON public.profiles TO anon;
GRANT DELETE ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT DELETE ON public.profiles TO service_role;
GRANT INSERT ON public.profiles TO service_role;
GRANT SELECT ON public.profiles TO service_role;
GRANT UPDATE ON public.profiles TO service_role;
GRANT DELETE ON public.rate_limits TO anon;
GRANT INSERT ON public.rate_limits TO anon;
GRANT SELECT ON public.rate_limits TO anon;
GRANT UPDATE ON public.rate_limits TO anon;
GRANT DELETE ON public.rate_limits TO authenticated;
GRANT INSERT ON public.rate_limits TO authenticated;
GRANT SELECT ON public.rate_limits TO authenticated;
GRANT UPDATE ON public.rate_limits TO authenticated;
GRANT DELETE ON public.rate_limits TO service_role;
GRANT INSERT ON public.rate_limits TO service_role;
GRANT SELECT ON public.rate_limits TO service_role;
GRANT UPDATE ON public.rate_limits TO service_role;
GRANT DELETE ON public.security_events TO anon;
GRANT INSERT ON public.security_events TO anon;
GRANT SELECT ON public.security_events TO anon;
GRANT UPDATE ON public.security_events TO anon;
GRANT DELETE ON public.security_events TO authenticated;
GRANT INSERT ON public.security_events TO authenticated;
GRANT SELECT ON public.security_events TO authenticated;
GRANT UPDATE ON public.security_events TO authenticated;
GRANT DELETE ON public.security_events TO service_role;
GRANT INSERT ON public.security_events TO service_role;
GRANT SELECT ON public.security_events TO service_role;
GRANT UPDATE ON public.security_events TO service_role;
GRANT DELETE ON public.tap_events TO anon;
GRANT INSERT ON public.tap_events TO anon;
GRANT SELECT ON public.tap_events TO anon;
GRANT UPDATE ON public.tap_events TO anon;
GRANT DELETE ON public.tap_events TO authenticated;
GRANT INSERT ON public.tap_events TO authenticated;
GRANT SELECT ON public.tap_events TO authenticated;
GRANT UPDATE ON public.tap_events TO authenticated;
GRANT DELETE ON public.tap_events TO service_role;
GRANT INSERT ON public.tap_events TO service_role;
GRANT SELECT ON public.tap_events TO service_role;
GRANT UPDATE ON public.tap_events TO service_role;
GRANT DELETE ON public.taps TO anon;
GRANT INSERT ON public.taps TO anon;
GRANT SELECT ON public.taps TO anon;
GRANT UPDATE ON public.taps TO anon;
GRANT DELETE ON public.taps TO authenticated;
GRANT INSERT ON public.taps TO authenticated;
GRANT SELECT ON public.taps TO authenticated;
GRANT UPDATE ON public.taps TO authenticated;
GRANT DELETE ON public.taps TO service_role;
GRANT INSERT ON public.taps TO service_role;
GRANT SELECT ON public.taps TO service_role;
GRANT UPDATE ON public.taps TO service_role;
GRANT DELETE ON public.user_roles TO anon;
GRANT INSERT ON public.user_roles TO anon;
GRANT SELECT ON public.user_roles TO anon;
GRANT UPDATE ON public.user_roles TO anon;
GRANT DELETE ON public.user_roles TO authenticated;
GRANT INSERT ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT UPDATE ON public.user_roles TO authenticated;
GRANT DELETE ON public.user_roles TO service_role;
GRANT INSERT ON public.user_roles TO service_role;
GRANT SELECT ON public.user_roles TO service_role;
GRANT UPDATE ON public.user_roles TO service_role;

-- Function execute grants
REVOKE EXECUTE ON FUNCTION public.admin_ban_user(_user_id uuid, _ban boolean, _reason text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(_user_id uuid, _role app_role, _grant boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(_bucket text, _max integer, _window_secs integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_official_card(_uid text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_security_event(_severity text, _category text, _action text, _route text, _user_agent text, _ip text, _details jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.normalize_card_uid() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.profile_is_visible(_profile_id uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_ban_user(_user_id uuid, _ban boolean, _reason text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ban_user(_user_id uuid, _ban boolean, _reason text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(_user_id uuid, _role app_role, _grant boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(_user_id uuid, _role app_role, _grant boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(_bucket text, _max integer, _window_secs integer) TO anon;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(_bucket text, _max integer, _window_secs integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_official_card(_uid text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_official_card(_uid text) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_security_event(_severity text, _category text, _action text, _route text, _user_agent text, _ip text, _details jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.normalize_card_uid() TO service_role;
GRANT EXECUTE ON FUNCTION public.profile_is_visible(_profile_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO service_role;
-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', 'f') ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', 'f') ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', 'f') ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY avatars_owner_all ON storage.objects AS PERMISSIVE FOR ALL TO authenticated USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))) WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
CREATE POLICY covers_owner_all ON storage.objects AS PERMISSIVE FOR ALL TO authenticated USING (((bucket_id = 'covers'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))) WITH CHECK (((bucket_id = 'covers'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
CREATE POLICY "media bucket owner delete" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'media'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "media bucket owner read" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING (((bucket_id = 'media'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "media bucket owner update" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING (((bucket_id = 'media'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "media bucket owner write" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'media'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
