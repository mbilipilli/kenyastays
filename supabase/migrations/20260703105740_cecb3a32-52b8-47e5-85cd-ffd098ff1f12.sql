
-- 1. Affiliates: drop public SELECT
DROP POLICY IF EXISTS "Anyone can look up active affiliates" ON public.affiliates;

-- 2. Cleaning partners: restrict to hosts/admins
DROP POLICY IF EXISTS "Anyone signed in can view active cleaning partners" ON public.cleaning_partners;
CREATE POLICY "Hosts and admins can view active cleaning partners"
  ON public.cleaning_partners FOR SELECT TO authenticated
  USING ((is_active = true AND public.has_role(auth.uid(), 'host'))
         OR public.has_role(auth.uid(), 'admin'));

-- 3. Remove self-insert on user_roles (handle_new_user trigger runs SECURITY DEFINER)
DROP POLICY IF EXISTS "roles insert self" ON public.user_roles;

-- 4. SECURITY DEFINER hardening
-- has_role: switch to INVOKER (authenticated has SELECT on own row; all call sites use auth.uid())
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Trigger-only definers: revoke direct execution
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.bookings_guard_update() FROM PUBLIC, authenticated, anon;
