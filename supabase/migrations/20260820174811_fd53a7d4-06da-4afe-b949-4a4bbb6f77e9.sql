CREATE TABLE public.mpesa_test_pushes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  phone text NOT NULL,
  amount_kes integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'queued',
  env text NOT NULL DEFAULT 'sandbox',
  account_ref text,
  checkout_request_id text,
  merchant_request_id text,
  mpesa_receipt text,
  result_code integer,
  result_desc text,
  error text,
  sent_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX mpesa_test_pushes_checkout_idx ON public.mpesa_test_pushes (checkout_request_id);
CREATE INDEX mpesa_test_pushes_created_idx ON public.mpesa_test_pushes (created_at DESC);

GRANT SELECT ON public.mpesa_test_pushes TO authenticated;
GRANT ALL ON public.mpesa_test_pushes TO service_role;

ALTER TABLE public.mpesa_test_pushes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view test pushes"
ON public.mpesa_test_pushes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER mpesa_test_pushes_touch
BEFORE UPDATE ON public.mpesa_test_pushes
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.mpesa_callback_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_request_id text,
  merchant_request_id text,
  result_code integer,
  result_desc text,
  mpesa_receipt text,
  amount_kes integer,
  phone text,
  matched_kind text NOT NULL DEFAULT 'unmatched',
  matched_id uuid,
  outcome text NOT NULL DEFAULT 'received',
  note text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX mpesa_callback_logs_created_idx ON public.mpesa_callback_logs (created_at DESC);
CREATE INDEX mpesa_callback_logs_checkout_idx ON public.mpesa_callback_logs (checkout_request_id);

GRANT SELECT ON public.mpesa_callback_logs TO authenticated;
GRANT ALL ON public.mpesa_callback_logs TO service_role;

ALTER TABLE public.mpesa_callback_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view callback logs"
ON public.mpesa_callback_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));