import type Stripe from "stripe";
import { PLANS, CREDIT_PACKS, type PlanId, type CreditPackId } from "./billing";

type SubProduct = {
  name: string;
  description: string;
  unitAmount: number;
  interval: "month" | "year";
};

const SUB_PRODUCTS: Record<Exclude<PlanId, "free">, SubProduct> = {
  pro: {
    name: "FreelanceFlow Pro",
    description: "500 AI credits/mo + all advanced features",
    unitAmount: PLANS.pro.priceUsd * 100,
    interval: "month",
  },
  proplus: {
    name: "FreelanceFlow Pro Plus",
    description: "2000 AI credits/mo + priority support",
    unitAmount: PLANS.proplus.priceUsd * 100,
    interval: "month",
  },
  pro_annual: {
    name: "FreelanceFlow Pro — Annual",
    description: "6,000 AI credits/yr + 1,200 bonus credits + 2 months free",
    unitAmount: PLANS.pro_annual.priceUsd * 100,
    interval: "year",
  },
  proplus_annual: {
    name: "FreelanceFlow Pro Plus — Annual",
    description: "24,000 AI credits/yr + 4,800 bonus credits + 2 months free",
    unitAmount: PLANS.proplus_annual.priceUsd * 100,
    interval: "year",
  },
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

async function findMatchingActivePrice(
  stripe: Stripe,
  productId: string,
  match: (p: Stripe.Price) => boolean,
) {
  const list = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  return list.data.find(match) ?? null;
}

export async function ensureCatalog(stripe: Stripe): Promise<Catalog> {
  const catalog: Catalog = { subscriptions: {}, packs: {} };

  for (const planId of ["pro", "proplus", "pro_annual", "proplus_annual"] as const) {
    const cfg = SUB_PRODUCTS[planId];
    let product = await findProductByMetadata(stripe, "tier", planId);
    if (!product) {
      product = await stripe.products.create({
        name: cfg.name,
        description: cfg.description,
        metadata: { tier: planId, app: "freelanceflow", interval: cfg.interval },
      });
    }
    let price = await findMatchingActivePrice(
      stripe,
      product.id,
      (p) => p.unit_amount === cfg.unitAmount && p.recurring?.interval === cfg.interval,
    );
    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: cfg.unitAmount,
        currency: "usd",
        recurring: { interval: cfg.interval },
        metadata: { tier: planId, interval: cfg.interval },
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
    let price = await findMatchingActivePrice(
      stripe,
      product.id,
      (p) => p.unit_amount === cfg.unitAmount && !p.recurring,
    );
    if (!price) {
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
