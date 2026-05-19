import { pgTable, serial, text, timestamp, numeric, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type PortfolioItem = {
  title: string;
  description: string;
  url?: string;
  imageUrl?: string;
};

export type SocialLinks = {
  website?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
};

export const profile = pgTable("profile", {
  id: serial("id").primaryKey(),
  displayName: text("display_name").notNull().default(""),
  headline: text("headline").notNull().default(""),
  bio: text("bio").notNull().default(""),
  skills: text("skills").array().notNull().default([]),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }),
  yearsExperience: integer("years_experience"),
  location: text("location"),
  portfolioItems: jsonb("portfolio_items").$type<PortfolioItem[]>().notNull().default([]),
  socialLinks: jsonb("social_links").$type<SocialLinks>().notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const upsertProfileSchema = createInsertSchema(profile).omit({
  id: true,
  updatedAt: true,
});
export type Profile = typeof profile.$inferSelect;
export type UpsertProfile = z.infer<typeof upsertProfileSchema>;
