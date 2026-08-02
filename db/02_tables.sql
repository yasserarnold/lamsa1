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
