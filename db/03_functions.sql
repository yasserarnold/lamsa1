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

