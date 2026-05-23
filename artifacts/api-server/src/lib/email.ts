import { Resend } from "resend";

type ResendConfig = { apiKey: string; fromEmail: string | null };

let cachedConfig: ResendConfig | null | undefined;

async function getResendConfig(): Promise<ResendConfig | null> {
  if (cachedConfig !== undefined) return cachedConfig;

  if (process.env.RESEND_API_KEY) {
    cachedConfig = {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.EMAIL_FROM ?? null,
    };
    return cachedConfig;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken =
    process.env.REPL_IDENTITY
      ? "repl " + process.env.REPL_IDENTITY
      : process.env.WEB_REPL_RENEWAL
        ? "depl " + process.env.WEB_REPL_RENEWAL
        : null;

  if (!hostname || !xReplitToken) {
    cachedConfig = null;
    return null;
  }

  try {
    const res = await fetch(
      `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=resend`,
      { headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken } },
    );
    if (!res.ok) {
      cachedConfig = null;
      return null;
    }
    const data = (await res.json()) as {
      items?: Array<{
        settings?: {
          api_key?: string;
          apiKey?: string;
          from_email?: string;
          fromEmail?: string;
        };
      }>;
    };
    const item = data.items?.[0];
    const apiKey = item?.settings?.api_key ?? item?.settings?.apiKey ?? null;
    const fromEmail =
      item?.settings?.from_email ?? item?.settings?.fromEmail ?? null;
    if (!apiKey) {
      cachedConfig = null;
      return null;
    }
    cachedConfig = { apiKey, fromEmail };
    return cachedConfig;
  } catch {
    cachedConfig = null;
    return null;
  }
}

// Clear the cached config so the next sendEmail re-fetches from the connector
// proxy. Useful after the user rotates their Resend key.
export function clearEmailConfigCache() {
  cachedConfig = undefined;
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

const FALLBACK_FROM = "FreelanceFlow AI <onboarding@resend.dev>";

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const config = await getResendConfig();
  if (!config) {
    console.warn(
      "[email] Resend not configured — falling back to console log. To: %s | Subject: %s",
      Array.isArray(args.to) ? args.to.join(", ") : args.to,
      args.subject,
    );
    return { ok: false, reason: "not_configured" };
  }

  const from = args.from ?? config.fromEmail ?? FALLBACK_FROM;

  try {
    const resend = new Resend(config.apiKey);
    const { data, error } = await resend.emails.send({
      from,
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
