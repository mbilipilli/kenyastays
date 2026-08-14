CREATE TABLE public.location_alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  window_minutes integer NOT NULL DEFAULT 15,
  max_requests integer NOT NULL DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.location_alert_rules TO authenticated;
GRANT ALL ON public.location_alert_rules TO service_role;
ALTER TABLE public.location_alert_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view alert rules" ON public.location_alert_rules FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER location_alert_rules_touch BEFORE UPDATE ON public.location_alert_rules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
INSERT INTO public.location_alert_rules (enabled, window_minutes, max_requests) VALUES (true, 15, 20);

CREATE TABLE public.suspicious_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_prefix text NOT NULL UNIQUE,
  note text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.suspicious_ips TO authenticated;
GRANT ALL ON public.suspicious_ips TO service_role;
ALTER TABLE public.suspicious_ips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view suspicious ips" ON public.suspicious_ips FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER suspicious_ips_touch BEFORE UPDATE ON public.suspicious_ips FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.location_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('threshold','suspicious_ip')),
  user_id uuid,
  ip_address text,
  action text,
  request_count integer NOT NULL DEFAULT 0,
  window_minutes integer,
  details text,
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX location_alerts_created_at_idx ON public.location_alerts (created_at DESC);
GRANT SELECT, UPDATE ON public.location_alerts TO authenticated;
GRANT ALL ON public.location_alerts TO service_role;
ALTER TABLE public.location_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view location alerts" ON public.location_alerts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can acknowledge location alerts" ON public.location_alerts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS location_access_logs_user_created_idx ON public.location_access_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS location_access_logs_ip_created_idx ON public.location_access_logs (ip_address, created_at DESC);