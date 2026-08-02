-- Triggers (public)
CREATE TRIGGER trg_nfc_cards_updated_at BEFORE UPDATE ON public.nfc_cards FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_normalize_card_uid BEFORE INSERT OR UPDATE OF card_uid ON public.nfc_cards FOR EACH ROW EXECUTE FUNCTION normalize_card_uid();
CREATE TRIGGER trg_profile_links_updated_at BEFORE UPDATE ON public.profile_links FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profile_media_updated BEFORE UPDATE ON public.profile_media FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profile_themes_updated BEFORE UPDATE ON public.profile_themes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
