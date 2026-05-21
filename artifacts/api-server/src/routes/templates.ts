import { Router } from "express";
import { db, templates } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireUser, type AuthedRequest } from "../lib/requireUser";

const router = Router();
router.use(requireUser);

const TemplateBody = z.object({
  name: z.string().min(1),
  category: z.string().default("proposal"),
  content: z.string().min(1),
});

function serialize(t: typeof templates.$inferSelect) {
  return { ...t, createdAt: t.createdAt.toISOString() };
}

router.get("/templates", async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const result = await db.select().from(templates).where(eq(templates.userId, uid)).orderBy(templates.createdAt);
    res.json(result.map(serialize));
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

router.post("/templates", async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const body = TemplateBody.parse(req.body);
    const [row] = await db.insert(templates).values({ ...body, userId: uid }).returning();
    res.status(201).json(serialize(row));
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

router.put("/templates/:id", async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const id = parseInt(req.params.id);
    const body = TemplateBody.partial().parse(req.body);
    const [row] = await db.update(templates).set(body).where(and(eq(templates.id, id), eq(templates.userId, uid))).returning();
    if (!row) return res.status(404).json({ error: "Template not found" });
    res.json(serialize(row));
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

router.delete("/templates/:id", async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const id = parseInt(req.params.id);
    const [row] = await db.delete(templates).where(and(eq(templates.id, id), eq(templates.userId, uid))).returning();
    if (!row) return res.status(404).json({ error: "Template not found" });
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

export default router;
