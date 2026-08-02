
-- 1. Ban columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz,
  ADD COLUMN IF NOT EXISTS ban_reason text;

-- Update the public read policy to hide banned profiles
DROP POLICY IF EXISTS profiles_public_read_published ON public.profiles;
CREATE POLICY profiles_public_read_published ON public.profiles
  FOR SELECT
  USING (is_published = true AND is_banned = false);

-- 2. Admin audit log
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON public.admin_actions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON public.admin_actions (target_type, target_id);

GRANT SELECT, INSERT ON public.admin_actions TO authenticated;
GRANT ALL ON public.admin_actions TO service_role;

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_actions_admin_read ON public.admin_actions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY admin_actions_admin_insert ON public.admin_actions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND actor_id = auth.uid());

-- 3. RPC: ban/unban user (admin only)
CREATE OR REPLACE FUNCTION public.admin_ban_user(_user_id uuid, _ban boolean, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
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
$fn$;

-- Update admin_set_user_role to also log to admin_actions
CREATE OR REPLACE FUNCTION public.admin_set_user_role(_user_id uuid, _role app_role, _grant boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
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
$fn$;
