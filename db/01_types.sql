-- Enum types (public)
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.card_event_type AS ENUM ('activated', 'written', 'deactivated', 'deleted', 'registered');
CREATE TYPE public.card_status AS ENUM ('unassigned', 'active', 'disabled');
CREATE TYPE public.link_type AS ENUM ('url', 'email', 'phone', 'whatsapp', 'instapay', 'social', 'messenger', 'website', 'instagram', 'x', 'linkedin', 'facebook', 'tiktok', 'youtube', 'github', 'telegram', 'snapchat', 'map', 'custom');
CREATE TYPE public.media_type AS ENUM ('image', 'video', 'pdf', 'file');
CREATE TYPE public.tap_event_type AS ENUM ('view', 'call', 'whatsapp', 'email', 'website', 'vcard', 'share', 'qr', 'link');
