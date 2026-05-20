import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { tasks } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

const upsertSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.enum(["todo", "in_progress", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.string().nullable().optional(),
  clientId: z.number().int().nullable().optional(),
});

router.get("/tasks", async (_req, res) => {
  const rows = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  res.json(rows);
});

router.post("/tasks", async (req, res) => {
  try {
    const body = upsertSchema.parse(req.body);
    const [row] = await db
      .insert(tasks)
      .values({
        title: body.title,
        description: body.description ?? null,
        status: body.status,
        priority: body.priority,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        clientId: body.clientId ?? null,
      })
      .returning();
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.patch("/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const body = upsertSchema.partial().parse(req.body);
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.status !== undefined) updates.status = body.status;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.dueDate !== undefined) updates.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.clientId !== undefined) updates.clientId = body.clientId;

    const [row] = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.delete("/tasks/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await db.delete(tasks).where(eq(tasks.id, id));
  res.status(204).end();
});

export default router;
