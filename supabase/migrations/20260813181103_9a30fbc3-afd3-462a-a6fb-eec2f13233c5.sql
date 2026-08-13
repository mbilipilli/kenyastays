-- Replace the role-"public" policy with an authenticated-only one
DROP POLICY IF EXISTS "properties public read" ON public.properties;

CREATE POLICY "properties authenticated read active or own"
ON public.properties
FOR SELECT
TO authenticated
USING (is_active OR host_id = auth.uid());

-- Remove any residual direct read access for anonymous visitors
REVOKE SELECT ON public.properties FROM anon;

-- Column-level: never expose exact location through PostgREST
REVOKE SELECT ON public.properties FROM authenticated;
GRANT SELECT (
  id, host_id, "profileId", title, description, property_type, city,
  price_kes, max_guests, bedrooms, bathrooms, amenities, landmarks,
  is_eco, is_community, is_active, is_featured, featured_until,
  cover_image, cleaning_partner_id, cleaning_fee_kes, created_at, updated_at
) ON public.properties TO authenticated;

GRANT ALL ON public.properties TO service_role;