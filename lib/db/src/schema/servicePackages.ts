import { pgTable, serial, text, timestamp, integer, boolean, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type PackageTier = {
  name: string;
  price: number;
  deliveryDays: number;
  revisions: number;
  deliverables: string[];
};

export type PackageFaq = {
  question: string;
  answer: string;
};

export const servicePackages = pgTable("service_packages", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  tagline: text("tagline"),
  description: text("description").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  deliveryDays: integer("delivery_days").notNull().default(7),
  revisions: integer("revisions").notNull().default(2),
  deliverables: text("deliverables").array().notNull().default([]),
  // Optional tiered pricing (Basic/Standard/Premium). If empty array, the
  // package renders as single-tier using the top-level price/deliveryDays/etc.
  tiers: jsonb("tiers").$type<PackageTier[]>().notNull().default([]),
  faqs: jsonb("faqs").$type<PackageFaq[]>().notNull().default([]),
  category: text("category"),
  ctaUrl: text("cta_url"),
  isPublic: boolean("is_public").notNull().default(true),
  views: integer("views").notNull().default(0),
  inquiries: integer("inquiries").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertServicePackageSchema = createInsertSchema(servicePackages).omit({
  id: true,
  userId: true,
  slug: true,
  views: true,
  inquiries: true,
  createdAt: true,
});

export type ServicePackage = typeof servicePackages.$inferSelect;
export type InsertServicePackage = z.infer<typeof insertServicePackageSchema>;
