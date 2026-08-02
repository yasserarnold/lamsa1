-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.card_status AS ENUM ('unassigned', 'active', 'disabled');
CREATE TYPE public.link_type AS ENUM ('url', 'email', 'phone', 'whatsapp', 'instapay', 'social');

-- =============================================
-- HELPER: updated_at trigger function
-- =============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================
-- PROFILES
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  title TEXT,
  bio TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  theme TEXT NOT NULL DEFAULT 'default',
  language TEXT NOT NULL DEFAULT 'ar',
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT username_format CHECK (username IS NULL OR username ~ '^[a-z0-9_-]{3,32}$')
);

CREATE INDEX idx_profiles_username ON public.profiles(username) WHERE username IS NOT NULL;
CREATE INDEX idx_profiles_published ON public.profiles(is_published) WHERE is_published = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================
-- USER ROLES (separate table — never on profiles)
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check role (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =============================================
-- PROFILE LINKS
-- =============================================
CREATE TABLE public.profile_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.link_type NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profile_links_profile ON public.profile_links(profile_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_links TO authenticated;
GRANT SELECT ON public.profile_links TO anon;
GRANT ALL ON public.profile_links TO service_role;

ALTER TABLE public.profile_links ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profile_links_updated_at BEFORE UPDATE ON public.profile_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================
-- NFC CARDS
-- =============================================
CREATE TABLE public.nfc_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_uid TEXT UNIQUE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status public.card_status NOT NULL DEFAULT 'unassigned',
  is_official BOOLEAN NOT NULL DEFAULT false,
  activated_at TIMESTAMPTZ,
  last_written_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nfc_cards_profile ON public.nfc_cards(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX idx_nfc_cards_official ON public.nfc_cards(is_official, profile_id);

GRANT SELECT, UPDATE ON public.nfc_cards TO authenticated;
GRANT ALL ON public.nfc_cards TO service_role;

ALTER TABLE public.nfc_cards ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_nfc_cards_updated_at BEFORE UPDATE ON public.nfc_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Normalize UID: UPPERCASE HEX
CREATE OR REPLACE FUNCTION public.normalize_card_uid()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.card_uid IS NOT NULL THEN
    NEW.card_uid = UPPER(regexp_replace(NEW.card_uid, '[^0-9A-Fa-f]', '', 'g'));
    IF NEW.card_uid !~ '^[0-9A-F]{8,32}$' THEN
      RAISE EXCEPTION 'card_uid يجب أن يكون Hex بطول 8 إلى 32 حرف';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_normalize_card_uid BEFORE INSERT OR UPDATE OF card_uid ON public.nfc_cards
  FOR EACH ROW EXECUTE FUNCTION public.normalize_card_uid();

-- =============================================
-- LEADS
-- =============================================
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  interest TEXT,
  source_card_uid TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT leads_name_len CHECK (char_length(name) BETWEEN 1 AND 120),
  CONSTRAINT leads_mobile_len CHECK (char_length(mobile) BETWEEN 5 AND 32),
  CONSTRAINT leads_interest_len CHECK (interest IS NULL OR char_length(interest) <= 300)
);

CREATE INDEX idx_leads_profile ON public.leads(profile_id, created_at DESC);

GRANT INSERT ON public.leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- profiles
CREATE POLICY "profiles_public_read_published" ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

CREATE POLICY "profiles_owner_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_owner_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_owner_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "user_roles_read_own" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- profile_links
CREATE POLICY "profile_links_public_read_visible" ON public.profile_links
  FOR SELECT TO anon, authenticated
  USING (
    is_visible = true
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.is_published = true)
  );

CREATE POLICY "profile_links_owner_all" ON public.profile_links
  FOR ALL TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- nfc_cards: users can read their own cards; admins do everything
CREATE POLICY "nfc_cards_read_own" ON public.nfc_cards
  FOR SELECT TO authenticated
  USING (auth.uid() = profile_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "nfc_cards_admin_all" ON public.nfc_cards
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- leads: anon can insert to published profiles only; owner can read/manage own
CREATE POLICY "leads_public_insert" ON public.leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.is_published = true)
  );

CREATE POLICY "leads_owner_read" ON public.leads
  FOR SELECT TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "leads_owner_delete" ON public.leads
  FOR DELETE TO authenticated
  USING (auth.uid() = profile_id);

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- CLAIM OFFICIAL CARD RPC
-- =============================================
CREATE OR REPLACE FUNCTION public.claim_official_card(_uid TEXT)
RETURNS public.nfc_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.claim_official_card(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, anon;