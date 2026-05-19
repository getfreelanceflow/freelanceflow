import { Router } from "express";
import { db, templates } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const TemplateBody = z.object({
  name: z.string().min(1),
  category: z.string().default("proposal"),
  content: z.string().min(1),
});

function serialize(t: typeof templates.$inferSelect) {
  return { ...t, createdAt: t.createdAt.toISOString() };
}

router.get("/templates", async (_req, res) => {
  try {
    const result = await db.select().from(templates).orderBy(templates.createdAt);
    res.json(result.map(serialize));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/templates", async (req, res) => {
  try {
    const body = TemplateBody.parse(req.body);
    const [row] = await db.insert(templates).values(body).returning();
    res.status(201).json(serialize(row));
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.put("/templates/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = TemplateBody.partial().parse(req.body);
    const [row] = await db.update(templates).set(body).where(eq(templates.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Template not found" });
    res.json(serialize(row));
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.delete("/templates/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db.delete(templates).where(eq(templates.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Template not found" });
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

export default router;
