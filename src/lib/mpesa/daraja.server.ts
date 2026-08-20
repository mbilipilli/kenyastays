// Safaricom Daraja M-Pesa STK Push client
const BASE = () =>
  (process.env.MPESA_ENV ?? "sandbox") === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

// Accept both MPESA_* and DARAJA_* naming for the same credential.
function requireEnv(name: string): string {
  const alt = name.startsWith("MPESA_") ? name.replace("MPESA_", "DARAJA_") : name.replace("DARAJA_", "MPESA_");
  // Trim: pasted credentials often carry trailing spaces/newlines, which make
  // Daraja reject the Basic auth header with a 400.
  const v = (process.env[name] ?? process.env[alt] ?? "").trim();
  if (!v) throw new Error(`Missing env ${name}. Add M-Pesa Daraja credentials to enable payments.`);
  return v;
}

export async function getToken(): Promise<string> {
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

export async function stkPush(params: {
  phone: string;
  amount: number;
  accountRef: string;
  description: string;
  callbackUrl: string;
}) {
  const shortcode = requireEnv("MPESA_SHORTCODE");
  const passkey = requireEnv("MPESA_PASSKEY");
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
    CallBackURL: params.callbackUrl,
    AccountReference: params.accountRef.slice(0, 12),
    TransactionDesc: params.description.slice(0, 20),
  };
  const res = await fetch(`${BASE()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: any = await res.json();
  if (!res.ok || json.errorCode) throw new Error(json.errorMessage || `STK push failed (${res.status})`);
  return {
    checkoutRequestId: json.CheckoutRequestID as string,
    merchantRequestId: json.MerchantRequestID as string,
  };
}
