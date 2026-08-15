DROP POLICY IF EXISTS "images readable by authenticated users" ON public.property_images;
CREATE POLICY "property_images_scoped_read" ON public.property_images
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_images.property_id
      AND (
        (p.is_active AND p.approval_status = 'approved')
        OR p.host_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
      )
  )
);