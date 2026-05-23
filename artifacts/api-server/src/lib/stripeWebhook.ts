import type Stripe from "stripe";
import { getUncachableStripeClient, getStripeWebhookSecret, getStripeSync } from "./stripeClient";
import {
  setPlan,
  grantCredits,
  creditPackFromPriceMetadata,
  planFromPriceMetadata,
  totalCreditsPerCycle,
  type PlanId,
} from "./billing";
import { db } from "@workspace/db";
import { processedStripeEvents } from "@workspace/db/schema";
import { logger } from "./logger";

function unixToDate(ts: number | null | undefined): Date | null {
  return ts ? new Date(ts * 1000) : null;
}

async function activateSubscription(
  userId: string,
  sub: Stripe.Subscription,
  customerId: string | null,
): Promise<void> {
  const priceMeta = sub.items.data[0]?.price?.metadata as Record<string, string> | undefined;
  const plan = planFromPriceMetadata(priceMeta) ?? "pro";
  const periodEnd = unixToDate(
    (sub as unknown as { current_period_end?: number }).current_period_end,
  );
  await setPlan(userId, plan, {
    stripeCustomerId: customerId ?? undefined,
    stripeSubscriptionId: sub.id,
    subscriptionStatus: sub.status,
    currentPeriodEnd: periodEnd,
  });
  const amount = totalCreditsPerCycle(plan);
  await grantCredits(userId, amount, "subscription_activation", {
    dedupeKey: `sub_init:${sub.id}`,
    metadata: { subscriptionId: sub.id, plan },
  });
  logger.info({ userId, plan, subId: sub.id, granted: amount }, "subscription activated");
}

async function handleCheckoutCompleted(stripe: Stripe, session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId || session.client_reference_id;
  if (!userId) {
    logger.warn({ sessionId: session.id }, "checkout.session.completed without userId metadata");
    return;
  }
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

  if (session.mode === "subscription" && session.subscription) {
    const subId =
      typeof session.subscription === "string" ? session.subscription : session.subscription.id;
    const sub = await stripe.subscriptions.retrieve(subId, { expand: ["items.data.price"] });
    await activateSubscription(userId, sub, customerId ?? null);
    return;
  }

  if (session.mode === "payment") {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      expand: ["data.price"],
    });
    for (const item of lineItems.data) {
      const priceMeta = item.price?.metadata as Record<string, string> | undefined;
      const pack = creditPackFromPriceMetadata(priceMeta);
      if (pack) {
        const credits = Number(priceMeta?.credits ?? "0");
        if (credits > 0) {
          await grantCredits(userId, credits * (item.quantity ?? 1), "credit_pack_purchase", {
            dedupeKey: `cs:${session.id}:${item.id}`,
            metadata: { sessionId: session.id, pack },
          });
          logger.info({ userId, pack, credits }, "credits granted");
        }
      }
    }
  }
}

async function handleSubscriptionUpdated(_stripe: Stripe, sub: Stripe.Subscription) {
  const userId =
    (sub.metadata?.userId as string | undefined) ||
    (typeof sub.customer === "object"
      ? ((sub.customer as Stripe.Customer).metadata?.userId as string | undefined)
      : undefined);
  if (!userId) {
    logger.warn({ subId: sub.id }, "subscription event without userId metadata");
    return;
  }
  const priceMeta = sub.items.data[0]?.price?.metadata as Record<string, string> | undefined;
  let plan: PlanId = planFromPriceMetadata(priceMeta) ?? "pro";
  if (sub.status === "canceled" || sub.status === "incomplete_expired" || sub.status === "unpaid") {
    plan = "free";
  }
  const periodEnd = unixToDate(
    (sub as unknown as { current_period_end?: number }).current_period_end,
  );
  await setPlan(userId, plan, {
    stripeSubscriptionId: sub.status === "canceled" ? null : sub.id,
    subscriptionStatus: sub.status,
    currentPeriodEnd: periodEnd,
  });
  logger.info({ userId, plan, status: sub.status }, "subscription updated");
}

async function handleInvoicePaid(stripe: Stripe, invoice: Stripe.Invoice) {
  const subId = (invoice as unknown as { subscription?: string | null }).subscription ?? null;
  if (!subId) return;
  // Renewals only — initial activation is handled by checkout.session.completed
  // via activateSubscription() (which grants with dedupeKey `sub_init:<subId>`).
  // Both signal the same intent for a brand-new subscription; we route the grant
  // through the cycle event to avoid double-granting.
  if (invoice.billing_reason !== "subscription_cycle") return;
  const sub = await stripe.subscriptions.retrieve(subId, { expand: ["items.data.price"] });
  const userId = sub.metadata?.userId as string | undefined;
  if (!userId) return;
  const priceMeta = sub.items.data[0]?.price?.metadata as Record<string, string> | undefined;
  const plan = planFromPriceMetadata(priceMeta) ?? "pro";
  const amount = totalCreditsPerCycle(plan);
  await grantCredits(userId, amount, "subscription_renewal", {
    dedupeKey: `inv:${invoice.id}`,
    metadata: { invoiceId: invoice.id, subscriptionId: sub.id, plan },
  });
  logger.info({ userId, plan, granted: amount, invoiceId: invoice.id }, "subscription renewed");
}

/**
 * Verify Stripe signature, dedupe by event.id, dispatch, then forward to StripeSync (best-effort).
 */
export async function processStripeWebhook(payload: Buffer, signature: string): Promise<void> {
  const stripe = await getUncachableStripeClient();
  const secret = await getStripeWebhookSecret();
  const event = stripe.webhooks.constructEvent(payload, signature, secret);

  // Idempotency: claim the event row first.
  const claim = await db
    .insert(processedStripeEvents)
    .values({ eventId: event.id, type: event.type })
    .onConflictDoNothing()
    .returning();
  if (claim.length === 0) {
    logger.info({ eventId: event.id, type: event.type }, "stripe event already processed");
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(stripe, event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionUpdated(stripe, event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
        await handleInvoicePaid(stripe, event.data.object as Stripe.Invoice);
        break;
      default:
        break;
    }
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err), eventId: event.id, type: event.type },
      "stripe event handler failed",
    );
    throw err;
  }

  // Best-effort sync to local stripe.* tables for catalog reads.
  try {
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "stripe-replit-sync processWebhook failed (non-fatal)",
    );
  }
}
