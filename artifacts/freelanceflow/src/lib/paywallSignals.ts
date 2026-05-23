import type { Job, BillingMe } from "@workspace/api-client-react";

/**
 * Strict check: returns true only once billing is resolved AND the plan is `free`.
 * During loading or fetch failure this returns false so paid users never flicker upsells.
 */
export function isFreeUser(billing: BillingMe | undefined | null): boolean {
  return billing?.plan === "free";
}

/** Credits at or below this threshold trigger the low-credit banner. */
export const LOW_CREDIT_THRESHOLD = 3;

export function isLowCredits(billing: BillingMe | undefined | null): boolean {
  if (!billing) return false;
  return billing.credits <= LOW_CREDIT_THRESHOLD;
}

export function isOutOfCredits(billing: BillingMe | undefined | null): boolean {
  if (!billing) return false;
  return billing.credits <= 0;
}

/**
 * Detect a "premium" / high-value opportunity worth nudging a free user about.
 * Heuristic combines budget, match score, and urgency signals already on the Job model.
 */
export function isHighValueJob(job: Pick<Job, "budgetMax" | "budgetMin" | "successScore"> | undefined | null): boolean {
  if (!job) return false;
  const score = job.successScore ?? 0;
  const budgetMax = job.budgetMax ?? 0;
  const budgetMin = job.budgetMin ?? 0;
  // High budget OR strong match OR a solid combination of both.
  if (budgetMax >= 2000) return true;
  if (score >= 85) return true;
  if (budgetMax >= 1000 && score >= 75) return true;
  if (budgetMin >= 500 && score >= 80) return true;
  return false;
}

export type PaywallVariant =
  | "high_value_job"
  | "premium_proposal"
  | "low_credit"
  | "out_of_credits";

export type PaywallCopy = {
  headline: string;
  body: string;
  primaryCta: string;
  secondaryCta: string;
};

/** Value-based messaging — describes the *outcome*, not the feature. */
export function copyFor(variant: PaywallVariant): PaywallCopy {
  switch (variant) {
    case "high_value_job":
      return {
        headline: "High-value opportunity — don't lose it",
        body: "Pro users win 3× more jobs like this with premium AI proposal tools and unlimited regenerations.",
        primaryCta: "Increase my win rate",
        secondaryCta: "Buy credits instead",
      };
    case "premium_proposal":
      return {
        headline: "Finish strong with Pro",
        body: "Your draft is ready. Pro unlocks the premium model + unlimited rewrites — clients accept Pro-tier proposals at a noticeably higher rate.",
        primaryCta: "Upgrade & polish this one",
        secondaryCta: "Continue with credits",
      };
    case "low_credit":
      return {
        headline: "You're almost out of credits",
        body: "Refill instantly with a credit pack, or upgrade to Pro for 500 credits every month + premium AI tools.",
        primaryCta: "Upgrade to Pro",
        secondaryCta: "Buy credits",
      };
    case "out_of_credits":
      return {
        headline: "You're out of AI credits",
        body: "Upgrade to keep your momentum, or top up with a one-time pack that never expires.",
        primaryCta: "Upgrade to Pro",
        secondaryCta: "Buy credits",
      };
  }
}
