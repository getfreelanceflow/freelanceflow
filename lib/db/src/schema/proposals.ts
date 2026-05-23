import { pgTable, serial, text, timestamp, numeric, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type ProposalAnalysis = {
  clientName: string | null;
  scamRisk: "none" | "low" | "medium" | "high";
  scamReasons: string[];
  budget: { level: "low" | "medium" | "high" | "unknown"; estimate: string | null };
  urgency: "low" | "medium" | "high";
  keywords: string[];
  fitScore: number;
  fitReason: string;
};

export const proposals = pgTable("proposals", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  jobId: integer("job_id"),
  jobTitle: text("job_title").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("draft"),
  successProbability: numeric("success_probability", { precision: 5, scale: 2 }),
  tone: text("tone"),
  length: text("length"),
  clientName: text("client_name"),
  keywords: text("keywords").array().notNull().default([]),
  aiAnalysis: jsonb("ai_analysis").$type<ProposalAnalysis | null>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertProposalSchema = createInsertSchema(proposals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = z.infer<typeof insertProposalSchema>;

export const proposalTemplates = pgTable("proposal_templates", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  niche: text("niche"),
  tone: text("tone"),
  isFavorite: integer("is_favorite").notNull().default(0),
  useCount: integer("use_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertProposalTemplateSchema = createInsertSchema(proposalTemplates).omit({
  id: true,
  userId: true,
  useCount: true,
  createdAt: true,
  updatedAt: true,
});
export type ProposalTemplate = typeof proposalTemplates.$inferSelect;
export type InsertProposalTemplate = z.infer<typeof insertProposalTemplateSchema>;
