INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role FROM auth.users u WHERE lower(u.email) = 'mbilipilli@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM public.user_roles ur
USING auth.users u
WHERE ur.user_id = u.id
  AND lower(u.email) = 'dicksonmaina1987@gmail.com'
  AND ur.role = 'admin'::app_role;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, r.role FROM auth.users u
CROSS JOIN (VALUES ('guest'::app_role), ('host'::app_role)) AS r(role)
WHERE lower(u.email) = 'dicksonmaina1987@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;