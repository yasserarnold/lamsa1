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
