import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { goals } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

const upsertSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["earnings", "proposals", "clients", "hours", "custom"]),
  target: z.number().positive(),
  period: z.enum(["week", "month", "quarter", "year"]).default("month"),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  currentValue: z.number().nonnegative().optional(),
});

router.get("/goals", async (_req, res) => {
  const rows = await db.select().from(goals).orderBy(desc(goals.createdAt));
  res.json(rows);
});

router.post("/goals", async (req, res) => {
  try {
    const body = upsertSchema.parse(req.body);
    const [row] = await db
      .insert(goals)
      .values({
        title: body.title,
        type: body.type,
        target: String(body.target),
        period: body.period,
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        currentValue: body.currentValue != null ? String(body.currentValue) : "0",
      })
      .returning();
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.patch("/goals/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const body = upsertSchema.partial().parse(req.body);
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.type !== undefined) updates.type = body.type;
    if (body.target !== undefined) updates.target = String(body.target);
    if (body.period !== undefined) updates.period = body.period;
    if (body.startDate !== undefined) updates.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) updates.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.currentValue !== undefined) updates.currentValue = String(body.currentValue);

    const [row] = await db.update(goals).set(updates).where(eq(goals.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.delete("/goals/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await db.delete(goals).where(eq(goals.id, id));
  res.status(204).end();
});

export default router;
