import { Router } from "express";
import { db, invoices, clients } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { requireUser, type AuthedRequest } from "../lib/requireUser";

const router = Router();
router.use(requireUser);

const LineItem = z.object({
  description: z.string(),
  quantity: z.number(),
  rate: z.number(),
});

const InvoiceBody = z.object({
  clientId: z.number().optional().nullable(),
  clientName: z.string().min(1),
  invoiceNumber: z.string().min(1),
  amount: z.union([z.number(), z.string()]),
  status: z.enum(["draft", "sent", "paid", "overdue"]).default("draft"),
  dueDate: z.string().optional().nullable(),
  items: z.array(LineItem).default([]),
  notes: z.string().optional().nullable(),
});

function serialize(i: typeof invoices.$inferSelect) {
  return {
    ...i,
    amount: parseFloat(i.amount),
    dueDate: i.dueDate?.toISOString() ?? null,
    sentAt: i.sentAt?.toISOString() ?? null,
    paidAt: i.paidAt?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
  };
}

async function recalcClientEarnings(uid: string, clientId: number) {
  const [{ total }] = await db
    .select({ total: sql<string>`COALESCE(SUM(${invoices.amount}), 0)::text` })
    .from(invoices)
    .where(sql`${invoices.clientId} = ${clientId} AND ${invoices.userId} = ${uid} AND ${invoices.status} = 'paid'`);
  await db.update(clients).set({ totalEarned: total }).where(and(eq(clients.id, clientId), eq(clients.userId, uid)));
}

router.get("/invoices", async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const result = await db.select().from(invoices).where(eq(invoices.userId, uid)).orderBy(invoices.createdAt);
    res.json(result.map(serialize));
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

router.post("/invoices", async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const body = InvoiceBody.parse(req.body);
    const [row] = await db
      .insert(invoices)
      .values({
        userId: uid,
        clientId: body.clientId ?? null,
        clientName: body.clientName,
        invoiceNumber: body.invoiceNumber,
        amount: String(body.amount),
        status: body.status,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        items: body.items,
        notes: body.notes ?? null,
        sentAt: body.status === "sent" || body.status === "paid" ? new Date() : null,
        paidAt: body.status === "paid" ? new Date() : null,
      })
      .returning();
    if (body.status === "paid" && body.clientId) await recalcClientEarnings(uid, body.clientId);
    res.status(201).json(serialize(row));
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

router.get("/invoices/:id", async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const id = parseInt(req.params.id);
    const [row] = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.userId, uid)));
    if (!row) return res.status(404).json({ error: "Invoice not found" });
    res.json(serialize(row));
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

router.put("/invoices/:id", async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const id = parseInt(req.params.id);
    const body = InvoiceBody.partial().parse(req.body);
    const updates: Record<string, unknown> = { ...body };
    if (body.amount != null) updates.amount = String(body.amount);
    if (body.dueDate != null) updates.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.status === "sent") updates.sentAt = new Date();
    if (body.status === "paid") updates.paidAt = new Date();
    const [row] = await db.update(invoices).set(updates).where(and(eq(invoices.id, id), eq(invoices.userId, uid))).returning();
    if (!row) return res.status(404).json({ error: "Invoice not found" });
    if (row.clientId) await recalcClientEarnings(uid, row.clientId);
    res.json(serialize(row));
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

router.delete("/invoices/:id", async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const id = parseInt(req.params.id);
    const [row] = await db.delete(invoices).where(and(eq(invoices.id, id), eq(invoices.userId, uid))).returning();
    if (!row) return res.status(404).json({ error: "Invoice not found" });
    if (row.clientId) await recalcClientEarnings(uid, row.clientId);
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

router.get("/earnings/summary", async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const all = await db.select().from(invoices).where(eq(invoices.userId, uid));
    const paid = all.filter((i) => i.status === "paid");
    const outstanding = all.filter((i) => i.status === "sent" || i.status === "overdue");
    const totalEarned = paid.reduce((s, i) => s + parseFloat(i.amount), 0);
    const totalOutstanding = outstanding.reduce((s, i) => s + parseFloat(i.amount), 0);

    const byMonth: Record<string, number> = {};
    for (const i of paid) {
      const d = i.paidAt ?? i.createdAt;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth[key] = (byMonth[key] ?? 0) + parseFloat(i.amount);
    }
    const monthly = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount }));

    res.json({
      totalEarned,
      totalOutstanding,
      paidCount: paid.length,
      outstandingCount: outstanding.length,
      monthly,
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

export default router;
