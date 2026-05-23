import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const userBilling = pgTable(
  "user_billing",
  {
    userId: text("user_id").primaryKey(),
    plan: text("plan").notNull().default("free"),
    credits: integer("credits").notNull().default(5),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    subscriptionStatus: text("subscription_status"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    freeCreditsResetAt: timestamp("free_credits_reset_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("user_billing_stripe_customer_idx").on(t.stripeCustomerId),
    index("user_billing_stripe_subscription_idx").on(t.stripeSubscriptionId),
  ],
);

export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    delta: integer("delta").notNull(),
    reason: text("reason").notNull(),
    dedupeKey: text("dedupe_key").unique(),
    metadata: text("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("credit_tx_user_idx").on(t.userId, t.createdAt)],
);

export const processedStripeEvents = pgTable("processed_stripe_events", {
  eventId: text("event_id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserBilling = typeof userBilling.$inferSelect;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
