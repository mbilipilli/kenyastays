
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS "profileId" uuid;

UPDATE public.properties p
  SET "profileId" = pr.id
  FROM public.profiles pr
  WHERE pr.id = p.host_id AND p."profileId" IS NULL;

-- Ensure a profile row exists for any host that somehow lacks one (defensive)
INSERT INTO public.profiles (id)
SELECT DISTINCT p.host_id
FROM public.properties p
LEFT JOIN public.profiles pr ON pr.id = p.host_id
WHERE pr.id IS NULL
ON CONFLICT DO NOTHING;

UPDATE public.properties p
  SET "profileId" = p.host_id
  WHERE p."profileId" IS NULL;

ALTER TABLE public.properties
  ALTER COLUMN "profileId" SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'properties_profileId_fkey'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT "properties_profileId_fkey"
      FOREIGN KEY ("profileId") REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS properties_profileId_idx ON public.properties ("profileId");

NOTIFY pgrst, 'reload schema';
