CREATE INDEX IF NOT EXISTS idx_nfc_cards_profile_status ON public.nfc_cards (profile_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_profile_created ON public.leads (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_links_profile_position ON public.profile_links (profile_id, position);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON public.admin_actions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON public.admin_actions (target_id);
CREATE INDEX IF NOT EXISTS idx_card_events_profile_created ON public.card_events (profile_id, created_at DESC);