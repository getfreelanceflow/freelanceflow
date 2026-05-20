import { Router } from "express";
import { db, clients, invoices } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { requireUser, type AuthedRequest } from "../lib/requireUser";

const router = Router();
router.use(requireUser);

const ClientBody = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  company: z.string().optional().nullable(),
  status: z.enum(["lead", "active", "past", "archived"]).default("lead"),
  notes: z.string().optional().nullable(),
  hourlyRate: z.union([z.number(), z.string()]).optional().nullable(),
});

function serialize(c: typeof clients.$inferSelect) {
  return {
    ...c,
    hourlyRate: c.hourlyRate ? parseFloat(c.hourlyRate) : null,
    totalEarned: parseFloat(c.totalEarned),
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/clients", async (req, res) => {
  try {
    const uid = (req as AuthedRequest).userId;
    const result = await db.select().from(clients).where(eq(clients.userId, uid)).orderBy(clients.createdAt);
    res.json(result.map(serialize));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/clients", async (req, res) => {
  try {
    const uid = (req as AuthedRequest).userId;
    const body = ClientBody.parse(req.body);
    const [row] = await db
      .insert(clients)
      .values({
        userId: uid,
        name: body.name,
        email: body.email ?? null,
        company: body.company ?? null,
        status: body.status,
        notes: body.notes ?? null,
        hourlyRate: body.hourlyRate != null ? String(body.hourlyRate) : null,
      })
      .returning();
    res.status(201).json(serialize(row));
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.get("/clients/:id", async (req, res) => {
  try {
    const uid = (req as AuthedRequest).userId;
    const id = parseInt(req.params.id);
    const [row] = await db.select().from(clients).where(and(eq(clients.id, id), eq(clients.userId, uid)));
    if (!row) return res.status(404).json({ error: "Client not found" });
    const clientInvoices = await db.select().from(invoices).where(and(eq(invoices.clientId, id), eq(invoices.userId, uid)));
    res.json({
      ...serialize(row),
      invoices: clientInvoices.map((i) => ({
        ...i,
        amount: parseFloat(i.amount),
        dueDate: i.dueDate?.toISOString() ?? null,
        sentAt: i.sentAt?.toISOString() ?? null,
        paidAt: i.paidAt?.toISOString() ?? null,
        createdAt: i.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.put("/clients/:id", async (req, res) => {
  try {
    const uid = (req as AuthedRequest).userId;
    const id = parseInt(req.params.id);
    const body = ClientBody.partial().parse(req.body);
    const updates: Record<string, unknown> = { ...body };
    if (body.hourlyRate != null) updates.hourlyRate = String(body.hourlyRate);
    const [row] = await db.update(clients).set(updates).where(and(eq(clients.id, id), eq(clients.userId, uid))).returning();
    if (!row) return res.status(404).json({ error: "Client not found" });
    res.json(serialize(row));
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.delete("/clients/:id", async (req, res) => {
  try {
    const uid = (req as AuthedRequest).userId;
    const id = parseInt(req.params.id);
    const [row] = await db.delete(clients).where(and(eq(clients.id, id), eq(clients.userId, uid))).returning();
    if (!row) return res.status(404).json({ error: "Client not found" });
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

export default router;
export { sql };
