-- Storage RLS: users can manage files under a folder named after their user id
CREATE POLICY "avatars_owner_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "covers_owner_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read of storage.objects rows for these buckets (signed URLs still required for file access)
CREATE POLICY "avatars_public_read_row" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('avatars', 'covers'));