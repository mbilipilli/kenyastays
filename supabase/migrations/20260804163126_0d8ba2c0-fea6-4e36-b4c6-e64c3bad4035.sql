-- Storage: remove blanket public read of property photos
DROP POLICY IF EXISTS "property-photos read" ON storage.objects;

CREATE POLICY "property-photos owner read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'property-photos'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Reviews: remove anonymous direct read (reviewer identity exposure)
DROP POLICY IF EXISTS "reviews public read" ON public.reviews;

CREATE POLICY "reviews authenticated read"
ON public.reviews FOR SELECT
TO authenticated
USING (true);

REVOKE SELECT ON public.reviews FROM anon;