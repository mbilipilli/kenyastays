CREATE TABLE public.location_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  property_ids uuid[] NOT NULL DEFAULT '{}',
  record_count integer NOT NULL DEFAULT 0,
  exposed_address boolean NOT NULL DEFAULT false,
  exposed_gps boolean NOT NULL DEFAULT false,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.location_access_logs TO authenticated;
GRANT ALL ON public.location_access_logs TO service_role;

ALTER TABLE public.location_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read location access logs"
ON public.location_access_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_location_access_logs_created_at ON public.location_access_logs (created_at DESC);
CREATE INDEX idx_location_access_logs_user_id ON public.location_access_logs (user_id);