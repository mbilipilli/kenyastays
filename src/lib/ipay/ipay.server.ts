// iPay Africa (payments.ipayafrica.com) checkout helper.
// Guests are redirected to iPay's hosted page where they can pay by
// card, PayPal, Airtel Money, Equitel etc. We sign the payload with
// HMAC-SHA1 over the exact field order iPay expects.
import { createHmac } from "crypto";

const GATEWAY = "https://payments.ipayafrica.com/v3/ke";
const IPN = "https://www.ipayafrica.com/ipn/";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}. Add your iPay credentials to enable card payments.`);
  return v;
}

export function ipayConfigured(): boolean {
  return Boolean(process.env["IPAY_VENDOR_ID"] && process.env["IPAY_HASH_KEY"]);
}

export type IpayFields = Record<string, string>;

/** Builds the signed form fields to POST to iPay's hosted checkout. */
export function buildIpayCheckout(params: {
  orderId: string;
  amountKes: number;
  phone: string;
  email: string;
  callbackUrl: string;
  successUrl: string;
  failUrl: string;
  channel?: "card" | "paypal" | "all";
}): { action: string; fields: IpayFields } {
  const vid = requireEnv("IPAY_VENDOR_ID");
  const key = requireEnv("IPAY_HASH_KEY");
  const live = (process.env["IPAY_LIVE"] ?? "0") === "1" ? "1" : "0";

  const oid = params.orderId;
  const inv = params.orderId;
  const ttl = String(Math.max(1, Math.round(params.amountKes)));
  const tel = params.phone || "0700000000";
  const eml = params.email || "guest@kenyastays.co.ke";
  const curr = "KES";
  const p1 = params.orderId;
  const p2 = "";
  const p3 = "";
  const p4 = "";
  const cbk = params.callbackUrl;
  const cst = "1";
  const crl = "2";

  // Order matters: live, oid, inv, ttl, tel, eml, vid, curr, p1..p4, cbk, cst, crl
  const dataString = [live, oid, inv, ttl, tel, eml, vid, curr, p1, p2, p3, p4, cbk, cst, crl].join("");
  const hsh = createHmac("sha1", key).update(dataString).digest("hex");

  const fields: IpayFields = {
    live,
    oid,
    inv,
    ttl,
    tel,
    eml,
    vid,
    curr,
    p1,
    p2,
    p3,
    p4,
    cbk,
    cst,
    crl,
    hsh,
    // Channel toggles
    autopay: "0",
    mpesa: "0",
    bonga: "0",
    airtel: params.channel === "all" ? "1" : "0",
    equity: "0",
    mobilebanking: "0",
    creditcard: params.channel === "paypal" ? "0" : "1",
    unionpay: "0",
    mvisa: "0",
    vooma: "0",
    pesalink: "0",
    paypal: params.channel === "card" ? "0" : "1",
  };

  return { action: GATEWAY, fields };
}

/**
 * iPay's IPN status query — the authoritative check. We never trust the
 * redirect's `status` param alone; we ask iPay directly.
 * Returns true only when iPay reports the success code aei7p7yrx4ae34.
 */
export async function verifyIpayPayment(q: URLSearchParams): Promise<{ paid: boolean; raw: string }> {
  const vid = requireEnv("IPAY_VENDOR_ID");
  const url = new URL(IPN);
  url.searchParams.set("vendor", vid);
  for (const k of ["id", "ivm", "qwh", "afd", "poi", "uyt", "ifd"]) {
    url.searchParams.set(k, q.get(k) ?? "");
  }
  const res = await fetch(url.toString());
  const text = (await res.text()).trim();
  return { paid: text.includes("aei7p7yrx4ae34"), raw: text.slice(0, 500) };
}
