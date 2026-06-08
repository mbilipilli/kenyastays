ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS "profileId" uuid;

INSERT INTO public.profiles (id, full_name)
SELECT DISTINCT b.guest_id, 'Guest'
FROM public.bookings b
LEFT JOIN public.profiles p ON p.id = b.guest_id
WHERE b.guest_id IS NOT NULL
  AND p.id IS NULL
ON CONFLICT (id) DO NOTHING;

UPDATE public.bookings
SET "profileId" = guest_id
WHERE "profileId" IS NULL;

ALTER TABLE public.bookings
ALTER COLUMN "profileId" SET NOT NULL;

ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS "bookings_profileId_fkey";

ALTER TABLE public.bookings
ADD CONSTRAINT "bookings_profileId_fkey"
FOREIGN KEY ("profileId")
REFERENCES public.profiles(id)
ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';