import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

async function getStripeCredentials(): Promise<{
  secretKey: string;
  publishableKey?: string;
  webhookSecret?: string;
}> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error("STRIPE_NOT_CONFIGURED");
  }

  const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
  const targetEnvironment = isProduction ? "production" : "development";

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", "stripe");
  url.searchParams.set("environment", targetEnvironment);

  const resp = await fetch(url.toString(), {
    headers: { Accept: "application/json", "X-Replit-Token": xReplitToken },
    signal: AbortSignal.timeout(10_000),
  });
  if (!resp.ok) throw new Error("STRIPE_NOT_CONFIGURED");

  const data = (await resp.json()) as {
    items?: Array<{
      settings?: {
        secret?: string;
        publishable?: string;
        webhook_secret?: string;
      };
    }>;
  };
  const settings = data.items?.[0]?.settings;
  if (!settings?.secret) throw new Error("STRIPE_NOT_CONFIGURED");

  return {
    secretKey: settings.secret,
    publishableKey: settings.publishable,
    webhookSecret: settings.webhook_secret ?? process.env.STRIPE_WEBHOOK_SECRET,
  };
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}

export async function getStripePublishableKey(): Promise<string | undefined> {
  const { publishableKey } = await getStripeCredentials();
  return publishableKey;
}

export async function getStripeSync(): Promise<StripeSync> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL required");
  const { secretKey, webhookSecret } = await getStripeCredentials();
  return new StripeSync({
    poolConfig: { connectionString: databaseUrl },
    stripeSecretKey: secretKey,
    stripeWebhookSecret: webhookSecret ?? "",
  });
}

let _positive = false;
let _negativeUntil = 0;
const NEG_TTL_MS = 60_000;
export async function isStripeConfigured(): Promise<boolean> {
  if (_positive) return true;
  if (Date.now() < _negativeUntil) return false;
  try {
    await getStripeCredentials();
    _positive = true;
    return true;
  } catch {
    _negativeUntil = Date.now() + NEG_TTL_MS;
    return false;
  }
}
export function resetStripeConfiguredCache() {
  _positive = false;
  _negativeUntil = 0;
}

export async function getStripeWebhookSecret(): Promise<string> {
  const { webhookSecret } = await getStripeCredentials();
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET_MISSING");
  return webhookSecret;
}
