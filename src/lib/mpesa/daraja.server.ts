// Safaricom Daraja M-Pesa STK Push client

/** MPESA_ENV has been set to odd values (URLs, blanks) — normalise it. */
export function mpesaEnv(): "sandbox" | "production" {
  const raw = (process.env["MPESA_ENV"] ?? process.env["DARAJA_ENV"] ?? "").trim().toLowerCase();
  return raw === "production" || raw === "live" || raw === "prod" ? "production" : "sandbox";
}

const BASE = () =>
  mpesaEnv() === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

// Public Safaricom sandbox test till + passkey. Used only when the project has
// no usable sandbox shortcode configured, so test pushes still work.
const SANDBOX_SHORTCODE = "174379";
const SANDBOX_PASSKEY =
  "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";

function readEnv(name: string): string {
  const alt = name.startsWith("MPESA_") ? name.replace("MPESA_", "DARAJA_") : name.replace("DARAJA_", "MPESA_");
  // Trim: pasted credentials often carry trailing spaces/newlines, which make
  // Daraja reject the Basic auth header with a 400.
  const v = (process.env[name] ?? process.env[alt] ?? "").trim();
  return v === "N/A" || v === "-" ? "" : v;
}

// Accept both MPESA_* and DARAJA_* naming for the same credential.
function requireEnv(name: string): string {
  const v = readEnv(name);
  if (!v) throw new Error(`Missing env ${name}. Add M-Pesa Daraja credentials to enable payments.`);
  return v;
}

/** Shortcode + passkey, falling back to Safaricom's sandbox test pair. */
export function stkCredentials(): { shortcode: string; passkey: string; usingSandboxDefaults: boolean } {
  const shortcode = readEnv("MPESA_SHORTCODE");
  const passkey = readEnv("MPESA_PASSKEY");
  const usable = shortcode.length >= 5 && passkey.length >= 20;
  if (usable) return { shortcode, passkey, usingSandboxDefaults: false };
  if (mpesaEnv() === "production")
    throw new Error(
      "Missing or invalid MPESA_SHORTCODE / MPESA_PASSKEY for production. Add your Lipa Na M-Pesa Online shortcode and passkey.",
    );
  return { shortcode: SANDBOX_SHORTCODE, passkey: SANDBOX_PASSKEY, usingSandboxDefaults: true };
}

// Safaricom throttles repeated OAuth calls (403 from their WAF), so cache the
// token for its lifetime instead of minting one per request.
let tokenCache: { token: string; expiresAt: number } | null = null;

export async function getToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;
  const key = requireEnv("MPESA_CONSUMER_KEY");
  const secret = requireEnv("MPESA_CONSUMER_SECRET");
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const url = `${BASE()}/oauth/v1/generate?grant_type=client_credentials`;
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
  });
  const text = await res.text();
  if (!res.ok) {
    const hint =
      res.status === 400 || res.status === 401
        ? ` — the Consumer Key/Secret are not valid for the "${process.env["MPESA_ENV"] ?? "sandbox"}" environment. Sandbox keys only work on sandbox, production keys only on production; re-copy them from your Daraja app with no extra spaces.`
        : "";
    throw new Error(`Daraja auth ${res.status}: ${text.slice(0, 200)}${hint}`);
  }
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Daraja auth returned non-JSON: ${text.slice(0, 200)}`);
  }
  if (!json.access_token) throw new Error(`Daraja auth returned no access_token: ${text.slice(0, 200)}`);
  const ttl = (Number(json.expires_in) || 3599) * 1000;
  tokenCache = { token: json.access_token, expiresAt: Date.now() + ttl };
  return json.access_token;
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return "254" + digits.slice(1);
  if (digits.startsWith("7") || digits.startsWith("1")) return "254" + digits;
  return digits;
}

/**
 * Daraja rejects callback URLs that are not plain https, carry a query string,
 * point at localhost, or whose path contains blocked words like "mpesa" or
 * "safaricom" — the failure surfaces as "Invalid CallBackURL".
 */
export function callbackFallbackOrigin(): string {
  return (process.env["PUBLIC_APP_URL"] ?? "https://kenyastays.co.ke").replace(/\/+$/, "");
}

/**
 * Hostnames Daraja is allowed to call back. Anything else is rejected and
 * rewritten to the canonical published host. Extra hosts (e.g. a custom
 * domain) can be added via MPESA_CALLBACK_HOSTS as a comma-separated list.
 */
export function allowedCallbackHosts(): string[] {
  const hosts = new Set<string>(["kenyastays.co.ke", "www.kenyastays.co.ke", "kenyastays-co-ke.lovable.app"]);
  try {
    hosts.add(new URL(callbackFallbackOrigin()).hostname.toLowerCase());
  } catch {
    /* ignore malformed PUBLIC_APP_URL */
  }
  for (const h of (process.env["MPESA_CALLBACK_HOSTS"] ?? "").split(",")) {
    const clean = h.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (clean) hosts.add(clean);
  }
  return [...hosts];
}

/** Why a callback URL is unusable, or null when it passes every check. */
export function callbackUrlRejection(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return "Not a valid absolute URL";
  }
  if (url.protocol !== "https:") return "Callback must use https";
  if (url.username || url.password) return "Credentials are not allowed in the callback URL";
  if (url.search || url.hash) return "Query strings and fragments are not allowed";
  if (url.port && url.port !== "443") return "Only the default https port is allowed";
  const host = url.hostname.toLowerCase();
  if (/^(localhost|127\.|0\.0\.0\.0|\[?::1)/i.test(host)) return "Local hostnames are not reachable by Daraja";
  if (host.includes("--") || /^id-preview/i.test(host) || host.length > 60)
    return "Preview hostnames are rejected by Safaricom";
  if (!allowedCallbackHosts().includes(host))
    return `Host "${host}" is not on the callback allowlist`;
  if (/(mpesa|m-pesa|safaricom|exe|sql|cmd)/i.test(url.pathname))
    return "Path contains a word Safaricom blocks";
  return null;
}

/**
 * Returns a callback URL Daraja will accept: the input when it passes the
 * allowlist and format checks, otherwise the canonical published endpoint.
 */
export function sanitizeCallbackUrl(
  input: string,
  fallbackPath = "/api/public/hooks/pay-callback",
): string {
  const reason = callbackUrlRejection(input);
  if (!reason) {
    const url = new URL(input);
    return url.origin + url.pathname;
  }
  console.warn(`[mpesa] rejected callback URL (${reason}) — using canonical endpoint`);
  return `${callbackFallbackOrigin()}${fallbackPath}`;
}

export async function stkPush(params: {
  phone: string;
  amount: number;
  accountRef: string;
  description: string;
  callbackUrl: string;
}) {

  const { shortcode, passkey } = stkCredentials();
  const ts = timestamp();
  const password = Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64");
  const token = await getToken();
  const body = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: ts,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.max(1, Math.round(params.amount)),
    PartyA: params.phone,
    PartyB: shortcode,
    PhoneNumber: params.phone,
    CallBackURL: sanitizeCallbackUrl(params.callbackUrl),
    AccountReference: params.accountRef.slice(0, 12),
    TransactionDesc: params.description.slice(0, 20),
  };
  const res = await fetch(`${BASE()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`STK push failed (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok || json.errorCode || !json.CheckoutRequestID) {
    const detail = json.errorMessage ?? json?.fault?.faultstring ?? text.slice(0, 200);
    throw new Error(`STK push failed (${res.status}): ${detail}`);
  }
  return {
    checkoutRequestId: json.CheckoutRequestID as string,
    merchantRequestId: json.MerchantRequestID as string,
  };
}
