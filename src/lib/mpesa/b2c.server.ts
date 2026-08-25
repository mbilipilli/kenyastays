// Safaricom Daraja B2C — sends money OUT of the platform shortcode to a host's M-Pesa.
const BASE = () =>
  (process.env["MPESA_ENV"] ?? "sandbox") === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

// Accept both MPESA_* and DARAJA_* naming for the same credential.
function requireEnv(name: string): string {
  const alt = name.startsWith("MPESA_") ? name.replace("MPESA_", "DARAJA_") : name.replace("DARAJA_", "MPESA_");
  const v = (process.env[name] ?? process.env[alt] ?? "").trim();
  if (!v) throw new Error(`Missing env ${name}. Add M-Pesa B2C credentials to enable host payouts.`);
  return v;
}

async function getToken(): Promise<string> {
  const { getToken: stkToken } = await import("./daraja.server");
  return stkToken();
}

const has = (n: string) =>
  Boolean(process.env[n] ?? process.env[n.replace("MPESA_", "DARAJA_")]);

export function b2cConfigured(): boolean {
  return (
    has("MPESA_CONSUMER_KEY") &&
    has("MPESA_CONSUMER_SECRET") &&
    has("MPESA_B2C_SHORTCODE") &&
    has("MPESA_INITIATOR_NAME") &&
    has("MPESA_SECURITY_CREDENTIAL")
  );
}

export async function b2cPayout(params: {
  phone: string;
  amount: number;
  remarks: string;
  occasion?: string;
  resultUrl: string;
  timeoutUrl: string;
  originatorConversationId: string;
}) {
  const token = await getToken();
  const { sanitizeCallbackUrl } = await import("./daraja.server");
  const body = {
    OriginatorConversationID: params.originatorConversationId,
    InitiatorName: requireEnv("MPESA_INITIATOR_NAME"),
    SecurityCredential: requireEnv("MPESA_SECURITY_CREDENTIAL"),
    CommandID: "BusinessPayment",
    Amount: Math.max(1, Math.round(params.amount)),
    PartyA: requireEnv("MPESA_B2C_SHORTCODE"),
    PartyB: params.phone,
    Remarks: params.remarks.slice(0, 100),
    QueueTimeOutURL: params.timeoutUrl,
    ResultURL: params.resultUrl,
    Occasion: (params.occasion ?? "").slice(0, 100),
  };
  const res = await fetch(`${BASE()}/mpesa/b2c/v3/paymentrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: any = await res.json();
  if (!res.ok || json.errorCode) throw new Error(json.errorMessage || `B2C request failed (${res.status})`);
  return {
    conversationId: json.ConversationID as string,
    originatorConversationId: json.OriginatorConversationID as string,
    responseDescription: json.ResponseDescription as string,
  };
}
