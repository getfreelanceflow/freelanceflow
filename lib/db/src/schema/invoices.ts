import { pgTable, serial, text, timestamp, numeric, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  rate: number;
};

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id"),
  clientName: text("client_name").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("draft"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  items: jsonb("items").$type<InvoiceLineItem[]>().notNull().default([]),
  notes: text("notes"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
});
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
