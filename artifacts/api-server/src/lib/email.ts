import { Resend } from "resend";

let cachedKey: string | null | undefined;

async function getResendApiKey(): Promise<string | null> {
  if (cachedKey !== undefined) return cachedKey;

  if (process.env.RESEND_API_KEY) {
    cachedKey = process.env.RESEND_API_KEY;
    return cachedKey;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken =
    process.env.REPL_IDENTITY
      ? "repl " + process.env.REPL_IDENTITY
      : process.env.WEB_REPL_RENEWAL
        ? "depl " + process.env.WEB_REPL_RENEWAL
        : null;

  if (!hostname || !xReplitToken) {
    cachedKey = null;
    return null;
  }

  try {
    const res = await fetch(
      `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=resend`,
      { headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken } },
    );
    if (!res.ok) {
      cachedKey = null;
      return null;
    }
    const data = (await res.json()) as {
      items?: Array<{ settings?: { api_key?: string; apiKey?: string } }>;
    };
    const item = data.items?.[0];
    const apiKey = item?.settings?.api_key ?? item?.settings?.apiKey ?? null;
    cachedKey = apiKey;
    return apiKey;
  } catch {
    cachedKey = null;
    return null;
  }
}

export type SendEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  from?: string;
};

export type SendEmailResult =
  | { ok: true; id: string | null; provider: "resend" }
  | { ok: false; reason: "not_configured" | "error"; message?: string };

const DEFAULT_FROM =
  process.env.EMAIL_FROM ?? "FreelanceFlow AI <onboarding@resend.dev>";

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const apiKey = await getResendApiKey();
  if (!apiKey) {
    console.warn(
      "[email] Resend not configured — falling back to console log. To: %s | Subject: %s",
      Array.isArray(args.to) ? args.to.join(", ") : args.to,
      args.subject,
    );
    return { ok: false, reason: "not_configured" };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: args.from ?? DEFAULT_FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      replyTo: args.replyTo,
    });
    if (error) {
      console.error("[email] Resend error:", error);
      return { ok: false, reason: "error", message: String(error.message ?? error) };
    }
    return { ok: true, id: data?.id ?? null, provider: "resend" };
  } catch (e) {
    console.error("[email] sendEmail threw:", e);
    return {
      ok: false,
      reason: "error",
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
