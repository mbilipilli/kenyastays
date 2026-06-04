import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const bookSchema = z.object({
  property_id: z.string().uuid(),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(30),
  notes: z.string().max(500).optional(),
});

function nightsBetween(a: string, b: string) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export const createBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => bookSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const nights = nightsBetween(data.check_in, data.check_out);
    if (nights < 1) throw new Error("Check-out must be after check-in");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prop, error: pErr } = await supabaseAdmin
      .from("properties")
      .select("id,host_id,price_kes,max_guests,is_active")
      .eq("id", data.property_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!prop || !prop.is_active) throw new Error("Listing unavailable");
    if (prop.host_id === userId) throw new Error("You can't book your own listing");
    if (data.guests > prop.max_guests) throw new Error(`Max ${prop.max_guests} guests`);

    // Availability check
    const { data: clash } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("property_id", prop.id)
      .in("status", ["pending", "confirmed"])
      .lt("check_in", data.check_out)
      .gt("check_out", data.check_in)
      .limit(1);
    if (clash && clash.length) throw new Error("Those dates are already booked");

    const total = prop.price_kes * nights;
    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        property_id: prop.id,
        guest_id: userId,
        host_id: prop.host_id,
        check_in: data.check_in,
        check_out: data.check_out,
        guests: data.guests,
        nights,
        total_kes: total,
        notes: data.notes ?? null,
        status: "pending",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return booking;
  });

export const myTrips = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("bookings")
      .select("*, properties:property_id(id,title,city,cover_image)")
      .eq("guest_id", userId)
      .order("check_in", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const hostBookings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("bookings")
      .select("*, properties:property_id(id,title,city), profiles:guest_id(full_name,avatar_url,phone)")
      .eq("host_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const updateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), status: z.enum(["confirmed", "cancelled", "completed"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("bookings").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getBookedDates = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ property_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("bookings")
      .select("check_in,check_out")
      .eq("property_id", data.property_id)
      .in("status", ["pending", "confirmed"]);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({ from: r.check_in as string, to: r.check_out as string }));
  });
