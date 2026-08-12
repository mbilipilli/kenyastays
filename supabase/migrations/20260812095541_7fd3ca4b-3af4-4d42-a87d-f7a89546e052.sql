CREATE TABLE public.ipay_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id text NOT NULL UNIQUE,
  amount_kes integer NOT NULL,
  channel text NOT NULL DEFAULT 'card',
  status text NOT NULL DEFAULT 'pending',
  ipay_txn_id text,
  ipay_status_code text,
  result_desc text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ipay_transactions_booking_idx ON public.ipay_transactions(booking_id);

GRANT SELECT ON public.ipay_transactions TO authenticated;
GRANT ALL ON public.ipay_transactions TO service_role;

ALTER TABLE public.ipay_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own iPay transactions"
ON public.ipay_transactions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all iPay transactions"
ON public.ipay_transactions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER ipay_transactions_touch BEFORE UPDATE ON public.ipay_transactions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();