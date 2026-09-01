import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const initiateMpesaPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ booking_id: z.string().uuid(), phone: z.string().min(9).max(15) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select("id,total_kes,guest_id,property_id,properties:property_id(title)")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (error || !booking) throw new Error("Booking not found");
    if (booking.guest_id !== context.userId) throw new Error("Not your booking");

    const { normalizePhone, stkPush } = await import("@/lib/mpesa/daraja.server");
    const phone = normalizePhone(data.phone);
    const origin = process.env.PUBLIC_APP_URL ?? "https://kenyastayz.lovable.app";
    const callbackUrl = `${origin}/api/public/hooks/pay-callback`;

    try {
      const res = await stkPush({
        phone,
        amount: booking.total_kes,
        accountRef: booking.id.slice(0, 12),
        description: `Booking ${booking.id.slice(0, 6)}`,
        callbackUrl,
      });
      await supabaseAdmin.from("mpesa_transactions").insert({
        booking_id: booking.id,
        user_id: context.userId,
        phone,
        amount_kes: booking.total_kes,
        checkout_request_id: res.checkoutRequestId,
        merchant_request_id: res.merchantRequestId,
        status: "pending",
      });
      return { ok: true, checkoutRequestId: res.checkoutRequestId };
    } catch (e: any) {
      // Record failed attempt so dashboard reflects it
      await supabaseAdmin.from("mpesa_transactions").insert({
        booking_id: booking.id,
        user_id: context.userId,
        phone,
        amount_kes: booking.total_kes,
        status: "error",
        result_desc: String(e?.message ?? e),
      });
      throw new Error(e?.message ?? "STK Push failed");
    }
  });

export const getMpesaStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ checkout_request_id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("mpesa_transactions")
      .select("*")
      .eq("checkout_request_id", data.checkout_request_id)
      .maybeSingle();
    if (!row || row.user_id !== context.userId) throw new Error("Not found");
    return row;
  });

async function assertAdmin(context: any) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

async function runTestPush(opts: { phone: string; amount: number; adminId: string }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { normalizePhone, stkPush } = await import("@/lib/mpesa/daraja.server");
  const phone = normalizePhone(opts.phone);
  const env = process.env["MPESA_ENV"] ?? "sandbox";
  const origin =
    process.env["PUBLIC_APP_URL"] ??
    "https://kenyastayz.lovable.app";
  const accountRef = `TEST-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  const { data: row } = await supabaseAdmin
    .from("mpesa_test_pushes")
    .insert({
      admin_id: opts.adminId,
      phone,
      amount_kes: opts.amount,
      env,
      account_ref: accountRef,
      status: "queued",
    })
    .select("id")
    .maybeSingle();

  try {
    const res = await stkPush({
      phone,
      amount: opts.amount,
      accountRef,
      description: "Test STK Push",
      callbackUrl: `${origin}/api/public/hooks/pay-callback`,
    });
    if (row)
      await supabaseAdmin
        .from("mpesa_test_pushes")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          checkout_request_id: res.checkoutRequestId,
          merchant_request_id: res.merchantRequestId,
        })
        .eq("id", row.id);
    return { ok: true as const, id: row?.id ?? null, env, phone, accountRef, ...res };
  } catch (e: any) {
    const error = String(e?.message ?? e);
    if (row)
      await supabaseAdmin
        .from("mpesa_test_pushes")
        .update({ status: "failed", error })
        .eq("id", row.id);
    return { ok: false as const, id: row?.id ?? null, env, phone, accountRef, error };
  }
}

export const testStkPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ phone: z.string().min(9).max(15), amount: z.number().int().min(1).max(1000).default(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return runTestPush({ phone: data.phone, amount: data.amount, adminId: context.userId });
  });

/** Re-send the most recent test push when it failed or never got a callback. */
export const retryLastTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: last } = await supabaseAdmin
      .from("mpesa_test_pushes")
      .select("phone,amount_kes,status")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!last) throw new Error("No previous test push to retry");
    if (last.status === "confirmed")
      throw new Error("The last test push already succeeded — nothing to retry");
    return runTestPush({ phone: last.phone, amount: last.amount_kes, adminId: context.userId });
  });

/** History of test pushes; stale 'sent' rows are flipped to 'timeout'. */
export const listTestPushes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from("mpesa_test_pushes")
      .update({ status: "timeout" })
      .eq("status", "sent")
      .lt("sent_at", cutoff);
    const { data } = await supabaseAdmin
      .from("mpesa_test_pushes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25);
    return data ?? [];
  });

/** Raw incoming Daraja callbacks, newest first, for troubleshooting refs. */
export const listCallbackLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("mpesa_callback_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25);
    return data ?? [];
  });

/** Unified ledger: every STK push with its callback events, codes and timestamps. */
export const listStkLedger = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { buildStkLedger } = await import("@/lib/mpesa/ledger.server");
    return buildStkLedger(50);
  });



export const mpesaConfigStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    // Never return values — only whether each credential is present.
    const has = (n: string) => {
      const v = (process.env[n] ?? process.env[n.replace("MPESA_", "DARAJA_")] ?? "").trim();
      if (!v || v === "N/A" || v === "-") return false;
      if (n === "MPESA_SHORTCODE") return v.length >= 5;
      if (n === "MPESA_PASSKEY") return v.length >= 20;
      return true;
    };
    return {
      env: (await import("@/lib/mpesa/daraja.server")).mpesaEnv(),
      callbackUrl: `${process.env["PUBLIC_APP_URL"] ?? "https://kenyastayz.lovable.app"}/api/public/hooks/pay-callback`,
      stk: {
        MPESA_CONSUMER_KEY: has("MPESA_CONSUMER_KEY"),
        MPESA_CONSUMER_SECRET: has("MPESA_CONSUMER_SECRET"),
        MPESA_SHORTCODE: has("MPESA_SHORTCODE"),
        MPESA_PASSKEY: has("MPESA_PASSKEY"),
      },
      payouts: {
        MPESA_B2C_SHORTCODE: has("MPESA_B2C_SHORTCODE"),
        MPESA_INITIATOR_NAME: has("MPESA_INITIATOR_NAME"),
        MPESA_SECURITY_CREDENTIAL: has("MPESA_SECURITY_CREDENTIAL"),
      },
    };
  });

/** Verify the Daraja Consumer Key/Secret by requesting an OAuth token. */
export const darajaAuthCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const env = process.env["MPESA_ENV"] ?? "sandbox";
    try {
      const { getToken } = await import("@/lib/mpesa/daraja.server");
      const token = await getToken();
      return { ok: true as const, env, tokenPreview: `${token.slice(0, 6)}…` };
    } catch (e: any) {
      return { ok: false as const, env, error: String(e?.message ?? e) };
    }
  });

/**
 * Admin-only: encrypt the Daraja initiator password with Safaricom's public
 * certificate to produce the SecurityCredential used by B2C payouts.
 * Paste the .cer contents from the Daraja portal; nothing is stored server-side.
 */
export const generateSecurityCredential = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        certificate: z.string().min(100).max(20000),
        initiator_password: z.string().min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const crypto = await import("node:crypto");
    let pem = data.certificate.trim();
    if (!pem.includes("BEGIN CERTIFICATE")) {
      const body = pem.replace(/\s+/g, "").match(/.{1,64}/g)?.join("\n") ?? "";
      pem = `-----BEGIN CERTIFICATE-----\n${body}\n-----END CERTIFICATE-----`;
    }
    let key: crypto.KeyObject;
    try {
      key = new crypto.X509Certificate(pem).publicKey;
    } catch {
      throw new Error("That does not look like a valid Daraja .cer certificate");
    }
    const credential = crypto
      .publicEncrypt(
        { key, padding: crypto.constants.RSA_PKCS1_PADDING },
        Buffer.from(data.initiator_password, "utf8"),
      )
      .toString("base64");
    return { credential };
  });
