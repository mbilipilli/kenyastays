import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "property-photos";
const SIGN_SECONDS = 60 * 60 * 6; // 6h

/**
 * Public surfaces only ever get an approximate pin (~1km) — the exact
 * coordinates and street address stay private until a booking is confirmed.
 */
const APPROX = (v: number | null) => (v == null ? null : Math.round(v * 100) / 100);


async function signMany(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const out: Record<string, string> = {};
  // Skip already-absolute URLs
  const toSign = paths.filter((p) => p && !p.startsWith("http"));
  const passthrough = paths.filter((p) => p && p.startsWith("http"));
  passthrough.forEach((p) => (out[p] = p));
  if (toSign.length) {
    const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrls(toSign, SIGN_SECONDS);
    data?.forEach((row, i) => {
      if (row.signedUrl) out[toSign[i]] = row.signedUrl;
    });
  }
  return out;
}

export type PropertyCard = {
  id: string;
  title: string;
  city: string;
  property_type: string;
  price_kes: number;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  is_eco: boolean;
  is_community: boolean;
  cover_url: string | null;
  rating: number | null;
  reviews_count: number;
  latitude: number | null;
  longitude: number | null;
};

const searchSchema = z.object({
  city: z.string().optional(),
  q: z.string().optional(),
  minPrice: z.number().int().nonnegative().optional(),
  maxPrice: z.number().int().nonnegative().optional(),
  amenities: z.array(z.string()).optional(),
  guests: z.number().int().positive().optional(),
  eco: z.boolean().optional(),
  type: z.enum(["apartment","lodge","homestay","guest_house","villa","cottage"]).optional(),
});

export const searchProperties = createServerFn({ method: "POST" })
  .inputValidator((d) => searchSchema.parse(d))
  .handler(async ({ data }): Promise<PropertyCard[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("properties")
      .select("*")
      .eq("is_active", true)
      .eq("approval_status", "approved");
    if (data.city) q = q.eq("city", data.city);
    if (data.q) q = q.or(`title.ilike.%${data.q}%,description.ilike.%${data.q}%,city.ilike.%${data.q}%`);
    if (data.minPrice != null) q = q.gte("price_kes", data.minPrice);
    if (data.maxPrice != null) q = q.lte("price_kes", data.maxPrice);
    if (data.guests) q = q.gte("max_guests", data.guests);
    if (data.eco) q = q.eq("is_eco", true);
    if (data.type) q = q.eq("property_type", data.type);
    if (data.amenities?.length) q = q.contains("amenities", data.amenities);
    q = q.order("created_at", { ascending: false }).limit(60);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const covers = rows.map((r) => r.cover_image).filter(Boolean) as string[];
    const signed = await signMany(covers);

    // Ratings
    const ids = rows.map((r) => r.id);
    const reviewsByProp: Record<string, { sum: number; n: number }> = {};
    if (ids.length) {
      const { data: revs } = await supabaseAdmin
        .from("reviews")
        .select("property_id,rating")
        .in("property_id", ids);
      revs?.forEach((r) => {
        const k = r.property_id;
        if (!reviewsByProp[k]) reviewsByProp[k] = { sum: 0, n: 0 };
        reviewsByProp[k].sum += r.rating;
        reviewsByProp[k].n += 1;
      });
    }

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      city: r.city,
      property_type: r.property_type,
      price_kes: r.price_kes,
      bedrooms: r.bedrooms,
      bathrooms: r.bathrooms,
      max_guests: r.max_guests,
      is_eco: r.is_eco,
      is_community: r.is_community,
      cover_url: r.cover_image ? signed[r.cover_image] ?? null : null,
      rating: reviewsByProp[r.id] ? +(reviewsByProp[r.id].sum / reviewsByProp[r.id].n).toFixed(1) : null,
      reviews_count: reviewsByProp[r.id]?.n ?? 0,
      latitude: APPROX(r.latitude),
      longitude: APPROX(r.longitude),

    }));
  });

export const getProperty = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prop, error } = await supabaseAdmin
      .from("properties")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!prop) throw new Error("Not found");

    const [{ data: images }, { data: reviews }, { data: host }] = await Promise.all([
      supabaseAdmin.from("property_images").select("*").eq("property_id", prop.id).order("sort_order"),
      supabaseAdmin
        .from("reviews")
        .select("id,rating,comment,created_at,guest_id,profiles:guest_id(full_name,avatar_url)")
        .eq("property_id", prop.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin.from("profiles").select("id,full_name,avatar_url,is_verified,created_at").eq("id", prop.host_id).maybeSingle(),
    ]);

    const allPaths = [prop.cover_image, ...(images ?? []).map((i) => i.url)].filter(Boolean) as string[];
    const signed = await signMany(allPaths);

    const rating = reviews?.length
      ? +(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null;

    return {
      ...prop,
      // Exact street address + GPS stay private on this public endpoint.
      address: null,
      latitude: APPROX(prop.latitude),
      longitude: APPROX(prop.longitude),
      cover_url: prop.cover_image ? signed[prop.cover_image] ?? null : null,
      // Only the signed URL leaves the server — raw storage paths embed host user IDs.
      images: (images ?? []).map((i) => ({
        id: i.id,
        sort_order: i.sort_order,
        signed_url: signed[i.url] ?? null,
      })),

      reviews: reviews ?? [],
      rating,
      reviews_count: reviews?.length ?? 0,
      host,
    };

  });

const createSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(4000),
  property_type: z.enum(["apartment","lodge","homestay","guest_house","villa","cottage"]),
  city: z.string().min(2).max(60),
  address: z.string().max(240).optional(),
  price_kes: z.number().int().min(100).max(10_000_000),
  max_guests: z.number().int().min(1).max(30),
  bedrooms: z.number().int().min(0).max(20),
  bathrooms: z.number().int().min(0).max(20),
  amenities: z.array(z.string().max(40)).max(40),
  landmarks: z.array(z.string().max(80)).max(20).optional(),
  is_eco: z.boolean().optional(),
  is_community: z.boolean().optional(),
  cover_image: z.string().max(500).optional(),
  image_paths: z.array(z.string().max(500)).max(20).optional(),
});

export const createProperty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Ensure host role
    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "host" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    if (roleError) throw new Error(roleError.message);

    const { data: prop, error } = await supabase
      .from("properties")
      .insert({
        host_id: userId,
        profileId: userId,
        title: data.title,
        description: data.description,
        property_type: data.property_type,
        city: data.city,
        address: data.address ?? null,
        price_kes: data.price_kes,
        max_guests: data.max_guests,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        amenities: data.amenities,
        landmarks: data.landmarks ?? [],
        is_eco: data.is_eco ?? false,
        is_community: data.is_community ?? false,
        cover_image: data.cover_image ?? null,
      })
      // Only select granted columns: `authenticated` has no SELECT on
      // address/latitude/longitude, so `select=*` would fail the RETURNING step.
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (data.image_paths?.length) {
      const { error: imgErr } = await supabase.from("property_images").insert(
        data.image_paths.map((url, i) => ({ property_id: prop.id, url, sort_order: i })),
      );
      if (imgErr) throw new Error(imgErr.message);
    }
    return { id: prop.id };
  });

export const myListings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    // Exact address/GPS are not readable through the user's client anymore;
    // the server scopes the admin read strictly to the caller's own listings.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("properties")
      .select("*")
      .eq("host_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const covers = data.map((r) => r.cover_image).filter(Boolean) as string[];
    const signed = await signMany(covers);

    // Audit: this response carries exact address + GPS for the caller's listings.
    const { logLocationAccess } = await import("@/lib/audit/location-audit.server");
    await logLocationAccess({
      userId,
      action: "myListings",
      propertyIds: data.map((r) => r.id),
      recordCount: data.length,
      exposedAddress: data.some((r) => r.address != null),
      exposedGps: data.some((r) => r.latitude != null || r.longitude != null),
    });

    return data.map((r) => ({ ...r, cover_url: r.cover_image ? signed[r.cover_image] ?? null : null }));
  });


export const toggleListingActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("properties")
      .update({ is_active: data.is_active })
      .eq("id", data.id)
      .eq("host_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
