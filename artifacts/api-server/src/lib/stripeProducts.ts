import type Stripe from "stripe";
import { PLANS, CREDIT_PACKS, type PlanId, type CreditPackId } from "./billing";

const SUB_PRODUCTS: Record<PlanId, { name: string; description: string; unitAmount: number }> = {
  free: { name: "Free", description: "Free plan", unitAmount: 0 },
  pro: { name: "FreelanceFlow Pro", description: "500 AI credits/mo + all advanced features", unitAmount: 1000 },
  proplus: { name: "FreelanceFlow Pro Plus", description: "2000 AI credits/mo + priority support", unitAmount: 2500 },
};

const PACK_PRODUCTS: Record<CreditPackId, { name: string; description: string; unitAmount: number }> = {
  small: { name: "Credits — Starter (50)", description: "50 AI credits, never expire", unitAmount: 500 },
  medium: { name: "Credits — Growth (200)", description: "200 AI credits, never expire", unitAmount: 1500 },
  large: { name: "Credits — Pro (500)", description: "500 AI credits, never expire", unitAmount: 3000 },
};

type CatalogEntry = { productId: string; priceId: string };
export type Catalog = {
  subscriptions: Partial<Record<Exclude<PlanId, "free">, CatalogEntry>>;
  packs: Partial<Record<CreditPackId, CatalogEntry>>;
};

async function findProductByMetadata(stripe: Stripe, key: string, value: string) {
  const search = await stripe.products.search({ query: `active:'true' AND metadata['${key}']:'${value}'` });
  return search.data[0] ?? null;
}

async function findActivePriceForProduct(stripe: Stripe, productId: string) {
  const list = await stripe.prices.list({ product: productId, active: true, limit: 5 });
  return list.data[0] ?? null;
}

export async function ensureCatalog(stripe: Stripe): Promise<Catalog> {
  const catalog: Catalog = { subscriptions: {}, packs: {} };

  for (const planId of ["pro", "proplus"] as const) {
    const cfg = SUB_PRODUCTS[planId];
    let product = await findProductByMetadata(stripe, "tier", planId);
    if (!product) {
      product = await stripe.products.create({
        name: cfg.name,
        description: cfg.description,
        metadata: { tier: planId, app: "freelanceflow" },
      });
    }
    let price = await findActivePriceForProduct(stripe, product.id);
    if (!price || price.unit_amount !== cfg.unitAmount || price.recurring?.interval !== "month") {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: cfg.unitAmount,
        currency: "usd",
        recurring: { interval: "month" },
        metadata: { tier: planId },
      });
    }
    catalog.subscriptions[planId] = { productId: product.id, priceId: price.id };
  }

  for (const packId of ["small", "medium", "large"] as const) {
    const cfg = PACK_PRODUCTS[packId];
    const credits = CREDIT_PACKS[packId].credits;
    let product = await findProductByMetadata(stripe, "creditPack", packId);
    if (!product) {
      product = await stripe.products.create({
        name: cfg.name,
        description: cfg.description,
        metadata: { creditPack: packId, credits: String(credits), app: "freelanceflow" },
      });
    }
    let price = await findActivePriceForProduct(stripe, product.id);
    if (!price || price.unit_amount !== cfg.unitAmount || price.recurring) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: cfg.unitAmount,
        currency: "usd",
        metadata: { creditPack: packId, credits: String(credits) },
      });
    }
    catalog.packs[packId] = { productId: product.id, priceId: price.id };
  }

  return catalog;
}
