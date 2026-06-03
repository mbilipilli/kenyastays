
CREATE POLICY "property-photos read" ON storage.objects FOR SELECT
  USING (bucket_id = 'property-photos');

CREATE POLICY "property-photos host insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "property-photos host update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'property-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "property-photos host delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'property-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
