import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { servicePackages } from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { createClerkClient } from "@clerk/express";
import { requireUser, type AuthedRequest } from "../lib/requireUser";
import { sendEmail, escapeHtml } from "../lib/email";

const clerkSecret = process.env.CLERK_SECRET_KEY;
const clerk = clerkSecret ? createClerkClient({ secretKey: clerkSecret }) : null;

async function getUserEmail(userId: string): Promise<string | null> {
  if (!clerk) return null;
  try {
    const u = await clerk.users.getUser(userId);
    const primaryId = u.primaryEmailAddressId;
    const primary =
      u.emailAddresses.find((e) => e.id === primaryId) ?? u.emailAddresses[0];
    return primary?.emailAddress ?? null;
  } catch {
    return null;
  }
}

const router = Router();

const safeUrl = z
  .string()
  .url()
  .refine((u) => /^https?:\/\//i.test(u), {
    message: "URL must start with http:// or https://",
  });

const upsertSchema = z.object({
  title: z.string().min(1).max(120),
  tagline: z.string().max(200).nullable().optional(),
  description: z.string().min(1),
  price: z.number().nonnegative(),
  currency: z.string().length(3).default("USD"),
  deliveryDays: z.number().int().positive().default(7),
  revisions: z.number().int().nonnegative().default(2),
  deliverables: z.array(z.string().min(1)).default([]),
  category: z.string().nullable().optional(),
  ctaUrl: safeUrl.nullable().optional().or(z.literal("")),
  isPublic: z.boolean().default(true),
});

// Minimal in-memory IP rate limit for public endpoints. Not durable across
// restarts or instances, but stops trivial counter-inflation by a single client.
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(bucketName: string, windowMs: number, max: number) {
  return function (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) {
    const ip = (req.ip || req.socket.remoteAddress || "unknown").toString();
    // Key by route class (bucketName), NOT req.path — otherwise an attacker
    // can bypass the limit by rotating across many slugs.
    const key = `${bucketName}::${ip}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    bucket.count++;
    if (bucket.count > max) {
      return res.status(429).json({ error: "Too many requests" });
    }
    next();
  };
}

function publicView(p: typeof servicePackages.$inferSelect) {
  return {
    slug: p.slug,
    title: p.title,
    tagline: p.tagline,
    description: p.description,
    price: p.price,
    currency: p.currency,
    deliveryDays: p.deliveryDays,
    revisions: p.revisions,
    deliverables: p.deliverables,
    category: p.category,
    ctaUrl: p.ctaUrl,
    isPublic: p.isPublic,
    views: p.views,
    inquiries: p.inquiries,
  };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "package";
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? root : `${root}-${Math.random().toString(36).slice(2, 6)}`;
    const [existing] = await db
      .select({ id: servicePackages.id })
      .from(servicePackages)
      .where(eq(servicePackages.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

// PUBLIC: view a shared package by slug (no auth) — registered before requireUser
router.get("/packages/public/:slug", rateLimit("pkg_view", 60_000, 60), async (req, res) => {
  try {
    const slug = String(req.params.slug);
    const [pkg] = await db
      .select()
      .from(servicePackages)
      .where(and(eq(servicePackages.slug, slug), eq(servicePackages.isPublic, true)))
      .limit(1);
    if (!pkg) return res.status(404).json({ error: "Not found" });
    // increment views (fire-and-forget; ignore failures)
    db.update(servicePackages)
      .set({ views: sql`${servicePackages.views} + 1` })
      .where(eq(servicePackages.id, pkg.id))
      .catch(() => {});
    res.json(publicView(pkg));
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

const inquireSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  message: z.string().max(5000).optional(),
});

router.post("/packages/public/:slug/inquire", rateLimit("pkg_inquire", 60_000, 5), async (req, res) => {
  try {
    const slug = String(req.params.slug);
    const parsed = inquireSchema.parse(req.body ?? {});
    const [pkg] = await db
      .select()
      .from(servicePackages)
      .where(and(eq(servicePackages.slug, slug), eq(servicePackages.isPublic, true)))
      .limit(1);
    if (!pkg) return res.status(404).json({ error: "Not found" });

    await db
      .update(servicePackages)
      .set({ inquiries: sql`${servicePackages.inquiries} + 1` })
      .where(eq(servicePackages.id, pkg.id));

    let delivered = false;
    if (parsed.name && parsed.email && parsed.message) {
      const ownerEmail = await getUserEmail(pkg.userId);
      if (ownerEmail) {
        const html = `
          <h2>New inquiry for "${escapeHtml(pkg.title)}"</h2>
          <p><strong>From:</strong> ${escapeHtml(parsed.name)} &lt;${escapeHtml(parsed.email)}&gt;</p>
          <p><strong>Package:</strong> ${escapeHtml(pkg.title)} — ${escapeHtml(String(pkg.price))} ${escapeHtml(pkg.currency)}</p>
          <hr/>
          <p style="white-space:pre-wrap">${escapeHtml(parsed.message)}</p>
          <hr/>
          <p style="color:#888;font-size:12px">Sent via your FreelanceFlow AI shareable package page.</p>
        `;
        const text = `New inquiry for "${pkg.title}"\nFrom: ${parsed.name} <${parsed.email}>\n\n${parsed.message}`;
        const result = await sendEmail({
          to: ownerEmail,
          subject: `[FreelanceFlow] New inquiry: ${pkg.title}`,
          html,
          text,
          replyTo: parsed.email,
        });
        delivered = result.ok;
      }
    }

    res.json({ ok: true, delivered });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", issues: e.issues });
    }
    res.status(500).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

router.get("/packages", requireUser, async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const rows = await db
      .select()
      .from(servicePackages)
      .where(eq(servicePackages.userId, uid))
      .orderBy(desc(servicePackages.createdAt));
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

router.post("/packages", requireUser, async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const body = upsertSchema.parse(req.body);
    const slug = await uniqueSlug(body.title);
    const [row] = await db
      .insert(servicePackages)
      .values({
        userId: uid,
        slug,
        title: body.title,
        tagline: body.tagline ?? null,
        description: body.description,
        price: String(body.price),
        currency: body.currency,
        deliveryDays: body.deliveryDays,
        revisions: body.revisions,
        deliverables: body.deliverables,
        category: body.category ?? null,
        ctaUrl: body.ctaUrl ? body.ctaUrl : null,
        isPublic: body.isPublic,
      })
      .returning();
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Invalid input" });
  }
});

router.patch("/packages/:id", requireUser, async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const id = parseInt(String(req.params.id), 10);
    const body = upsertSchema.partial().parse(req.body);
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.tagline !== undefined) updates.tagline = body.tagline;
    if (body.description !== undefined) updates.description = body.description;
    if (body.price !== undefined) updates.price = String(body.price);
    if (body.currency !== undefined) updates.currency = body.currency;
    if (body.deliveryDays !== undefined) updates.deliveryDays = body.deliveryDays;
    if (body.revisions !== undefined) updates.revisions = body.revisions;
    if (body.deliverables !== undefined) updates.deliverables = body.deliverables;
    if (body.category !== undefined) updates.category = body.category;
    if (body.ctaUrl !== undefined) updates.ctaUrl = body.ctaUrl ? body.ctaUrl : null;
    if (body.isPublic !== undefined) updates.isPublic = body.isPublic;
    const [row] = await db
      .update(servicePackages)
      .set(updates)
      .where(and(eq(servicePackages.id, id), eq(servicePackages.userId, uid)))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Invalid input" });
  }
});

router.delete("/packages/:id", requireUser, async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const id = parseInt(String(req.params.id), 10);
    await db
      .delete(servicePackages)
      .where(and(eq(servicePackages.id, id), eq(servicePackages.userId, uid)));
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

export { router as servicePackagesRouter };
