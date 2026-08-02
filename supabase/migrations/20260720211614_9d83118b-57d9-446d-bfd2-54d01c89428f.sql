-- Admin oversight for card_events
CREATE POLICY "Admins can view all card events"
ON public.card_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Document rate_limits access model (accessed only via SECURITY DEFINER function check_rate_limit)
COMMENT ON TABLE public.rate_limits IS
  'Accessed exclusively via public.check_rate_limit (SECURITY DEFINER). No client policies by design; RLS enabled to deny all direct client access.';