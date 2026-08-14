CREATE TYPE public.listing_approval AS ENUM ('pending','approved','rejected');

CREATE TABLE public.host_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version text NOT NULL DEFAULT 'v1',
  accepted_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, version)
);

GRANT SELECT, INSERT ON public.host_agreements TO authenticated;
GRANT ALL ON public.host_agreements TO service_role;

ALTER TABLE public.host_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts read own agreement" ON public.host_agreements
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Hosts accept own agreement" ON public.host_agreements
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER touch_host_agreements BEFORE UPDATE ON public.host_agreements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.properties
  ADD COLUMN approval_status public.listing_approval NOT NULL DEFAULT 'pending',
  ADD COLUMN admin_notes text,
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN reviewed_by uuid;

UPDATE public.properties SET approval_status = 'approved', reviewed_at = now();

CREATE INDEX idx_properties_approval_status ON public.properties (approval_status);

GRANT SELECT (approval_status, admin_notes, reviewed_at, reviewed_by) ON public.properties TO authenticated;