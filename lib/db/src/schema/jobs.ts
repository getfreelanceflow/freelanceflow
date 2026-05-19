import { pgTable, serial, text, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  budgetMin: numeric("budget_min", { precision: 10, scale: 2 }).notNull(),
  budgetMax: numeric("budget_max", { precision: 10, scale: 2 }).notNull(),
  skills: text("skills").array().notNull().default([]),
  postedAt: timestamp("posted_at", { withTimezone: true }).defaultNow().notNull(),
  platform: text("platform").notNull(),
  successScore: numeric("success_score", { precision: 5, scale: 2 }).notNull().default("0"),
  clientName: text("client_name"),
  clientRating: numeric("client_rating", { precision: 3, scale: 1 }),
});

export const insertJobSchema = createInsertSchema(jobs).omit({ id: true });
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
