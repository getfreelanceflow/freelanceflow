import { Router } from "express";
import { z } from "zod";
import { requireUser, type AuthedRequest } from "../lib/requireUser";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _AuthedRequest = AuthedRequest;
import { db } from "@workspace/db";
import { userBilling } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  getOrCreateBilling,
  PLANS,
  CREDIT_PACKS,
  totalCreditsPerCycle,
  type PlanId,
  type CreditPackId,
} from "../lib/billing";
import { AI_COSTS, AI_ACTION_LABELS } from "../lib/aiCosts";
import { getUncachableStripeClient, isStripeConfigured } from "../lib/stripeClient";
import { ensureCatalog } from "../lib/stripeProducts";
import { logger } from "../lib/logger";

const router = Router();

router.get("/billing/me", requireUser, async (req, res) => {
  const uid = (req as unknown as AuthedRequest).userId;
  const b = await getOrCreateBilling(uid);
  const stripeConfigured = await isStripeConfigured();
  res.json({
    plan: b.plan,
    planName: PLANS[(b.plan as PlanId) in PLANS ? (b.plan as PlanId) : "free"].name,
    credits: b.credits,
    subscriptionStatus: b.subscriptionStatus,
    currentPeriodEnd: b.currentPeriodEnd?.toISOString() ?? null,
    hasStripeCustomer: !!b.stripeCustomerId,
    stripeConfigured,
  });
});

router.get("/billing/catalog", async (_req, res) => {
  res.json({
    plans: Object.entries(PLANS).map(([id, p]) => ({
      id,
      ...p,
      totalCreditsPerCycle: totalCreditsPerCycle(id as PlanId),
    })),
    creditPacks: Object.entries(CREDIT_PACKS).map(([id, p]) => ({ id, ...p })),
  });
});

router.get("/billing/ai-costs", (_req, res) => {
  res.json({
    costs: AI_COSTS,
    labels: AI_ACTION_LABELS,
  });
});

const SubscriptionBody = z.object({
  tier: z.enum(["pro", "proplus", "pro_annual", "proplus_annual"]),
  successUrl: z.string().optional(),
  cancelUrl: z.string().optional(),
});
const PackBody = z.object({ pack: z.enum(["small", "medium", "large"]), successUrl: z.string().optional(), cancelUrl: z.string().optional() });

async function ensureCustomer(uid: string): Promise<string> {
  const b = await getOrCreateBilling(uid);
  if (b.stripeCustomerId) return b.stripeCustomerId;
  const stripe = await getUncachableStripeClient();
  const customer = await stripe.customers.create({ metadata: { userId: uid } });
  await db
    .update(userBilling)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(userBilling.userId, uid));
  return customer.id;
}

function trustedOrigin(): string | null {
  const dev = process.env.REPLIT_DEV_DOMAIN;
  if (dev) return `https://${dev}`;
  const deployed = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  if (deployed) return `https://${deployed}`;
  return null;
}

router.post("/billing/checkout-subscription", requireUser, async (req, res) => {
  const uid = (req as unknown as AuthedRequest).userId;
  if (!(await isStripeConfigured())) return res.status(503).json({ error: "stripe_not_configured" });
  try {
    const body = SubscriptionBody.parse(req.body);
    const stripe = await getUncachableStripeClient();

    // If user already has an active subscription, route them to the billing portal
    // to switch/cancel instead of creating a parallel subscription.
    const existing = await getOrCreateBilling(uid);
    if (
      existing.stripeCustomerId &&
      existing.stripeSubscriptionId &&
      existing.subscriptionStatus &&
      ["active", "trialing", "past_due"].includes(existing.subscriptionStatus)
    ) {
      const origin = trustedOrigin();
      const portal = await stripe.billingPortal.sessions.create({
        customer: existing.stripeCustomerId,
        return_url: `${origin ?? ""}/billing`,
      });
      return res.json({ url: portal.url, mode: "portal" });
    }

    const catalog = await ensureCatalog(stripe);
    const entry = catalog.subscriptions[body.tier];
    if (!entry) return res.status(500).json({ error: "price_not_found" });
    const customerId = await ensureCustomer(uid);
    const origin = trustedOrigin();
    if (!origin) return res.status(500).json({ error: "trusted_origin_unavailable" });
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: entry.priceId, quantity: 1 }],
      success_url: body.successUrl ?? `${origin}/billing?status=success`,
      cancel_url: body.cancelUrl ?? `${origin}/pricing?status=cancel`,
      client_reference_id: uid,
      metadata: { userId: uid, tier: body.tier },
      subscription_data: { metadata: { userId: uid, tier: body.tier } },
      allow_promotion_codes: true,
    });
    res.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error({ err: msg }, "checkout-subscription failed");
    res.status(500).json({ error: msg });
  }
});

router.post("/billing/checkout-credits", requireUser, async (req, res) => {
  const uid = (req as unknown as AuthedRequest).userId;
  if (!(await isStripeConfigured())) return res.status(503).json({ error: "stripe_not_configured" });
  try {
    const body = PackBody.parse(req.body);
    const stripe = await getUncachableStripeClient();
    const catalog = await ensureCatalog(stripe);
    const entry = catalog.packs[body.pack as CreditPackId];
    if (!entry) return res.status(500).json({ error: "price_not_found" });
    const customerId = await ensureCustomer(uid);
    const origin = trustedOrigin();
    if (!origin) return res.status(500).json({ error: "trusted_origin_unavailable" });
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: entry.priceId, quantity: 1 }],
      success_url: body.successUrl ?? `${origin}/billing?status=success`,
      cancel_url: body.cancelUrl ?? `${origin}/pricing?status=cancel`,
      client_reference_id: uid,
      metadata: { userId: uid, pack: body.pack },
      allow_promotion_codes: true,
    });
    res.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error({ err: msg }, "checkout-credits failed");
    res.status(500).json({ error: msg });
  }
});

router.post("/billing/portal", requireUser, async (req, res) => {
  const uid = (req as unknown as AuthedRequest).userId;
  if (!(await isStripeConfigured())) return res.status(503).json({ error: "stripe_not_configured" });
  try {
    const b = await getOrCreateBilling(uid);
    if (!b.stripeCustomerId) return res.status(400).json({ error: "no_customer" });
    const stripe = await getUncachableStripeClient();
    const origin = trustedOrigin();
    if (!origin) return res.status(500).json({ error: "trusted_origin_unavailable" });
    const session = await stripe.billingPortal.sessions.create({
      customer: b.stripeCustomerId,
      return_url: `${origin}/billing`,
    });
    res.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

export default router;
