ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payout_phone text;

CREATE TABLE IF NOT EXISTS public.host_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  host_id uuid NOT NULL,
  amount_kes integer NOT NULL,
  phone text,
  status text NOT NULL DEFAULT 'queued',
  conversation_id text,
  originator_conversation_id text,
  mpesa_receipt text,
  result_code integer,
  result_desc text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id)
);

GRANT SELECT ON public.host_payouts TO authenticated;
GRANT ALL ON public.host_payouts TO service_role;

ALTER TABLE public.host_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts view own payouts" ON public.host_payouts
  FOR SELECT TO authenticated
  USING (auth.uid() = host_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS host_payouts_host_idx ON public.host_payouts(host_id);
CREATE INDEX IF NOT EXISTS host_payouts_status_idx ON public.host_payouts(status);

CREATE TRIGGER host_payouts_touch BEFORE UPDATE ON public.host_payouts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();