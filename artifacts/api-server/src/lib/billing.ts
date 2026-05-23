import { db } from "@workspace/db";
import { userBilling, creditTransactions, type UserBilling } from "@workspace/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { logger } from "./logger";

export const PLANS = {
  free: {
    name: "Free",
    monthlyCredits: 5,
    bonusCreditsPerMonth: 0,
    allowAdvanced: false,
    interval: "month" as const,
    priceUsd: 0,
  },
  pro: {
    name: "Pro",
    monthlyCredits: 500,
    bonusCreditsPerMonth: 0,
    allowAdvanced: true,
    interval: "month" as const,
    priceUsd: 10,
  },
  proplus: {
    name: "Pro Plus",
    monthlyCredits: 2000,
    bonusCreditsPerMonth: 0,
    allowAdvanced: true,
    interval: "month" as const,
    priceUsd: 25,
  },
  pro_annual: {
    name: "Pro (Annual)",
    monthlyCredits: 500,
    bonusCreditsPerMonth: 100,
    allowAdvanced: true,
    interval: "year" as const,
    priceUsd: 96,
  },
  proplus_annual: {
    name: "Pro Plus (Annual)",
    monthlyCredits: 2000,
    bonusCreditsPerMonth: 400,
    allowAdvanced: true,
    interval: "year" as const,
    priceUsd: 240,
  },
} as const;

export type PlanId = keyof typeof PLANS;

/**
 * Total credits granted per billing cycle (the period the user pays for).
 * Monthly plans: monthly + bonus. Annual: (monthly + bonus) × 12.
 */
export function totalCreditsPerCycle(plan: PlanId): number {
  const p = PLANS[plan];
  const perMonth = p.monthlyCredits + p.bonusCreditsPerMonth;
  return p.interval === "year" ? perMonth * 12 : perMonth;
}

export function isPaidPlan(plan: string): plan is Exclude<PlanId, "free"> {
  return plan === "pro" || plan === "proplus" || plan === "pro_annual" || plan === "proplus_annual";
}

export const CREDIT_PACKS = {
  small: { credits: 50, priceUsd: 5, label: "Starter pack" },
  medium: { credits: 200, priceUsd: 15, label: "Growth pack" },
  large: { credits: 500, priceUsd: 30, label: "Pro pack" },
} as const;

export type CreditPackId = keyof typeof CREDIT_PACKS;

const MS_30_DAYS = 30 * 24 * 60 * 60 * 1000;

export async function getOrCreateBilling(userId: string): Promise<UserBilling> {
  const [existing] = await db.select().from(userBilling).where(eq(userBilling.userId, userId));
  if (existing) return maybeResetFreeMonthly(existing);
  const [row] = await db
    .insert(userBilling)
    .values({ userId, plan: "free", credits: PLANS.free.monthlyCredits })
    .onConflictDoNothing()
    .returning();
  if (row) return row;
  const [refetched] = await db.select().from(userBilling).where(eq(userBilling.userId, userId));
  return refetched;
}

async function maybeResetFreeMonthly(b: UserBilling): Promise<UserBilling> {
  if (b.plan !== "free") return b;
  const last = b.freeCreditsResetAt?.getTime() ?? 0;
  if (Date.now() - last < MS_30_DAYS) return b;
  const [updated] = await db
    .update(userBilling)
    .set({
      credits: sql`GREATEST(${userBilling.credits}, ${PLANS.free.monthlyCredits})`,
      freeCreditsResetAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(userBilling.userId, b.userId))
    .returning();
  return updated;
}

/**
 * Atomically consume credits. Returns ok+remaining on success, or insufficient_credits.
 * Uses a conditional UPDATE so concurrent callers cannot drive the balance negative.
 */
export async function consumeCredits(
  userId: string,
  amount: number,
  reason: string,
  metadata?: Record<string, unknown>,
): Promise<
  | { ok: true; remaining: number; txId: string }
  | { ok: false; reason: "insufficient_credits"; needed: number; have: number }
> {
  await getOrCreateBilling(userId);

  const [updated] = await db
    .update(userBilling)
    .set({ credits: sql`${userBilling.credits} - ${amount}`, updatedAt: new Date() })
    .where(and(eq(userBilling.userId, userId), gte(userBilling.credits, amount)))
    .returning();

  if (!updated) {
    const [current] = await db.select().from(userBilling).where(eq(userBilling.userId, userId));
    return { ok: false, reason: "insufficient_credits", needed: amount, have: current?.credits ?? 0 };
  }

  const txId = randomUUID();
  await db.insert(creditTransactions).values({
    id: txId,
    userId,
    delta: -amount,
    reason,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
  return { ok: true, remaining: updated.credits, txId };
}

/**
 * Refund a previously-consumed amount. Use when the downstream operation (e.g. AI call) fails.
 */
export async function refundCredits(
  userId: string,
  amount: number,
  originalTxId: string,
  reason: string,
): Promise<void> {
  await db
    .update(userBilling)
    .set({ credits: sql`${userBilling.credits} + ${amount}`, updatedAt: new Date() })
    .where(eq(userBilling.userId, userId));
  await db.insert(creditTransactions).values({
    id: randomUUID(),
    userId,
    delta: amount,
    reason,
    metadata: JSON.stringify({ refundOf: originalTxId }),
  });
}

/**
 * Grant credits idempotently. If `dedupeKey` is provided and already used, this is a no-op.
 */
export async function grantCredits(
  userId: string,
  amount: number,
  reason: string,
  opts: { dedupeKey?: string; metadata?: Record<string, unknown> } = {},
): Promise<{ granted: boolean }> {
  await getOrCreateBilling(userId);

  const inserted = await db
    .insert(creditTransactions)
    .values({
      id: randomUUID(),
      userId,
      delta: amount,
      reason,
      dedupeKey: opts.dedupeKey ?? null,
      metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
    })
    .onConflictDoNothing({ target: creditTransactions.dedupeKey })
    .returning();

  if (inserted.length === 0) {
    logger.info({ userId, reason, dedupeKey: opts.dedupeKey }, "grantCredits dedupe hit");
    return { granted: false };
  }

  await db
    .update(userBilling)
    .set({ credits: sql`${userBilling.credits} + ${amount}`, updatedAt: new Date() })
    .where(eq(userBilling.userId, userId));
  return { granted: true };
}

export async function setPlan(
  userId: string,
  plan: PlanId,
  stripeData?: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string | null;
    subscriptionStatus?: string | null;
    currentPeriodEnd?: Date | null;
  },
): Promise<UserBilling> {
  await getOrCreateBilling(userId);
  // NOTE: setPlan no longer touches the credit balance. Credits are granted
  // exclusively via grantCredits() (with dedupeKey) by the Stripe webhook
  // handlers on subscription activation and renewal. This prevents
  // double-granting that previously happened when both checkout.session.completed
  // and the first invoice.paid fired.
  const [updated] = await db
    .update(userBilling)
    .set({
      plan,
      ...(stripeData?.stripeCustomerId ? { stripeCustomerId: stripeData.stripeCustomerId } : {}),
      stripeSubscriptionId: stripeData?.stripeSubscriptionId ?? null,
      subscriptionStatus: stripeData?.subscriptionStatus ?? null,
      currentPeriodEnd: stripeData?.currentPeriodEnd ?? null,
      updatedAt: new Date(),
    })
    .where(eq(userBilling.userId, userId))
    .returning();
  return updated;
}

export function planFromPriceMetadata(meta: Record<string, string> | null | undefined): PlanId | null {
  const t = meta?.tier;
  if (t === "pro" || t === "proplus" || t === "pro_annual" || t === "proplus_annual") return t;
  return null;
}

export function creditPackFromPriceMetadata(
  meta: Record<string, string> | null | undefined,
): CreditPackId | null {
  const p = meta?.creditPack;
  if (p === "small" || p === "medium" || p === "large") return p;
  return null;
}
