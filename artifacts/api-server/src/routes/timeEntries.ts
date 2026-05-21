import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { timeEntries } from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireUser, type AuthedRequest } from "../lib/requireUser";

const router = Router();
router.use(requireUser);

const upsertSchema = z.object({
  clientId: z.number().int().nullable().optional(),
  description: z.string().min(1),
  startedAt: z.string(),
  endedAt: z.string().nullable().optional(),
  hours: z.number().nonnegative().default(0),
  rate: z.number().nonnegative().nullable().optional(),
  billable: z.boolean().default(true),
});

router.get("/time-entries", async (req, res) => {
  const uid = (req as unknown as AuthedRequest).userId;
  const rows = await db.select().from(timeEntries).where(eq(timeEntries.userId, uid)).orderBy(desc(timeEntries.startedAt));
  res.json(rows);
});

router.post("/time-entries", async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const body = upsertSchema.parse(req.body);
    const [row] = await db
      .insert(timeEntries)
      .values({
        userId: uid,
        clientId: body.clientId ?? null,
        description: body.description,
        startedAt: new Date(body.startedAt),
        endedAt: body.endedAt ? new Date(body.endedAt) : null,
        hours: String(body.hours),
        rate: body.rate != null ? String(body.rate) : null,
        billable: body.billable,
      })
      .returning();
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.patch("/time-entries/:id", async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const id = parseInt(req.params.id, 10);
    const body = upsertSchema.partial().parse(req.body);
    const updates: Record<string, unknown> = {};
    if (body.description !== undefined) updates.description = body.description;
    if (body.clientId !== undefined) updates.clientId = body.clientId;
    if (body.startedAt !== undefined) updates.startedAt = new Date(body.startedAt);
    if (body.endedAt !== undefined) updates.endedAt = body.endedAt ? new Date(body.endedAt) : null;
    if (body.hours !== undefined) updates.hours = String(body.hours);
    if (body.rate !== undefined) updates.rate = body.rate != null ? String(body.rate) : null;
    if (body.billable !== undefined) updates.billable = body.billable;

    const [row] = await db
      .update(timeEntries)
      .set(updates)
      .where(and(eq(timeEntries.id, id), eq(timeEntries.userId, uid)))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.delete("/time-entries/:id", async (req, res) => {
  const uid = (req as unknown as AuthedRequest).userId;
  const id = parseInt(req.params.id, 10);
  await db.delete(timeEntries).where(and(eq(timeEntries.id, id), eq(timeEntries.userId, uid)));
  res.status(204).end();
});

router.get("/time-entries/summary", async (req, res) => {
  const uid = (req as unknown as AuthedRequest).userId;
  const rows = await db
    .select({
      totalHours: sql<string>`COALESCE(SUM(${timeEntries.hours}), 0)`,
      billableHours: sql<string>`COALESCE(SUM(CASE WHEN ${timeEntries.billable} THEN ${timeEntries.hours} ELSE 0 END), 0)`,
      entryCount: sql<number>`COUNT(*)::int`,
    })
    .from(timeEntries)
    .where(eq(timeEntries.userId, uid));
  const r = rows[0] ?? { totalHours: "0", billableHours: "0", entryCount: 0 };
  res.json({
    totalHours: parseFloat(r.totalHours),
    billableHours: parseFloat(r.billableHours),
    entryCount: r.entryCount,
  });
});

export default router;
