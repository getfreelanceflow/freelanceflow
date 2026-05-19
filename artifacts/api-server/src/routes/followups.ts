import { Router } from "express";
import { db, followups } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const FollowupBody = z.object({
  clientId: z.number().optional().nullable(),
  proposalId: z.number().optional().nullable(),
  title: z.string().min(1),
  notes: z.string().optional().nullable(),
  dueDate: z.string(),
});

function serialize(f: typeof followups.$inferSelect) {
  return {
    ...f,
    dueDate: f.dueDate.toISOString(),
    createdAt: f.createdAt.toISOString(),
  };
}

router.get("/followups", async (_req, res) => {
  try {
    const result = await db.select().from(followups).orderBy(followups.dueDate);
    res.json(result.map(serialize));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/followups", async (req, res) => {
  try {
    const body = FollowupBody.parse(req.body);
    const [row] = await db
      .insert(followups)
      .values({
        clientId: body.clientId ?? null,
        proposalId: body.proposalId ?? null,
        title: body.title,
        notes: body.notes ?? null,
        dueDate: new Date(body.dueDate),
      })
      .returning();
    res.status(201).json(serialize(row));
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.put("/followups/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = z
      .object({
        title: z.string().optional(),
        notes: z.string().nullable().optional(),
        dueDate: z.string().optional(),
        completed: z.boolean().optional(),
      })
      .parse(req.body);
    const updates: Record<string, unknown> = { ...body };
    if (body.dueDate) updates.dueDate = new Date(body.dueDate);
    const [row] = await db.update(followups).set(updates).where(eq(followups.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Follow-up not found" });
    res.json(serialize(row));
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.delete("/followups/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db.delete(followups).where(eq(followups.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Follow-up not found" });
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

export default router;
