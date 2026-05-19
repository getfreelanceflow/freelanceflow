import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const followups = pgTable("followups", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id"),
  proposalId: integer("proposal_id"),
  title: text("title").notNull(),
  notes: text("notes"),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertFollowupSchema = createInsertSchema(followups).omit({
  id: true,
  createdAt: true,
  completed: true,
});
export type Followup = typeof followups.$inferSelect;
export type InsertFollowup = z.infer<typeof insertFollowupSchema>;
