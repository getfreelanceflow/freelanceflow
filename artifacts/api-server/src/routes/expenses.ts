import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { expenses } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

const upsertSchema = z.object({
  description: z.string().min(1),
  amount: z.number().nonnegative(),
  category: z.string().default("other"),
  date: z.string(),
  taxDeductible: z.boolean().default(true),
  notes: z.string().nullable().optional(),
});

router.get("/expenses", async (_req, res) => {
  const rows = await db.select().from(expenses).orderBy(desc(expenses.date));
  res.json(rows);
});

router.post("/expenses", async (req, res) => {
  try {
    const body = upsertSchema.parse(req.body);
    const [row] = await db
      .insert(expenses)
      .values({
        description: body.description,
        amount: String(body.amount),
        category: body.category,
        date: new Date(body.date),
        taxDeductible: body.taxDeductible,
        notes: body.notes ?? null,
      })
      .returning();
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.patch("/expenses/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const body = upsertSchema.partial().parse(req.body);
    const updates: Record<string, unknown> = {};
    if (body.description !== undefined) updates.description = body.description;
    if (body.amount !== undefined) updates.amount = String(body.amount);
    if (body.category !== undefined) updates.category = body.category;
    if (body.date !== undefined) updates.date = new Date(body.date);
    if (body.taxDeductible !== undefined) updates.taxDeductible = body.taxDeductible;
    if (body.notes !== undefined) updates.notes = body.notes;

    const [row] = await db.update(expenses).set(updates).where(eq(expenses.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.delete("/expenses/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await db.delete(expenses).where(eq(expenses.id, id));
  res.status(204).end();
});

router.get("/expenses/summary", async (_req, res) => {
  const byCategory = await db
    .select({
      category: expenses.category,
      total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
    })
    .from(expenses)
    .groupBy(expenses.category);

  const totals = await db
    .select({
      total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
      deductible: sql<string>`COALESCE(SUM(CASE WHEN ${expenses.taxDeductible} THEN ${expenses.amount} ELSE 0 END), 0)`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(expenses);

  const t = totals[0] ?? { total: "0", deductible: "0", count: 0 };
  res.json({
    total: parseFloat(t.total),
    deductible: parseFloat(t.deductible),
    count: t.count,
    byCategory: byCategory.map((r) => ({
      category: r.category,
      total: parseFloat(r.total),
    })),
  });
});

export default router;
