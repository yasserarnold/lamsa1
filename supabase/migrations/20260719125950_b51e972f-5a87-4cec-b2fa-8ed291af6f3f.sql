
CREATE TYPE public.card_event_type AS ENUM ('activated','written','deactivated','deleted','registered');

CREATE TABLE public.card_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES public.nfc_cards(id) ON DELETE SET NULL,
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_uid TEXT NOT NULL,
  event_type public.card_event_type NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_card_events_profile ON public.card_events(profile_id, created_at DESC);
CREATE INDEX idx_card_events_card ON public.card_events(card_id, created_at DESC);

GRANT SELECT, INSERT ON public.card_events TO authenticated;
GRANT ALL ON public.card_events TO service_role;

ALTER TABLE public.card_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read their card events"
  ON public.card_events FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Owners insert their card events"
  ON public.card_events FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());
