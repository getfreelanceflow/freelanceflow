import { Router } from "express";
import { db, profile } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireUser, type AuthedRequest } from "../lib/requireUser";

const router = Router();
router.use(requireUser);

const PortfolioItem = z.object({
  title: z.string(),
  description: z.string(),
  url: z.string().optional(),
  imageUrl: z.string().optional(),
});

// Only allow http(s) URLs in social/profile links. We accept empty strings
// (treat as cleared) and reject anything starting with javascript:, data:, etc.
const safeUrl = z
  .string()
  .optional()
  .transform((v) => (v ?? "").trim())
  .refine(
    (v) => {
      if (!v) return true;
      try {
        const u = new URL(v);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Must be a valid http(s) URL" },
  );

const SocialLinks = z.object({
  website: safeUrl,
  linkedin: safeUrl,
  github: safeUrl,
  twitter: safeUrl,
});

const ProfileBody = z.object({
  displayName: z.string().default(""),
  headline: z.string().default(""),
  bio: z.string().default(""),
  skills: z.array(z.string()).default([]),
  hourlyRate: z.union([z.number(), z.string()]).optional().nullable(),
  yearsExperience: z.number().optional().nullable(),
  location: z.string().optional().nullable(),
  portfolioItems: z.array(PortfolioItem).default([]),
  socialLinks: SocialLinks.default({}),
  publicEnabled: z.boolean().optional(),
});

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

async function uniqueSlug(base: string, excludeId: number): Promise<string> {
  const root = slugify(base) || "user";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const [hit] = await db
      .select({ id: profile.id })
      .from(profile)
      .where(eq(profile.publicSlug, candidate))
      .limit(1);
    if (!hit || hit.id === excludeId) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

function serialize(p: typeof profile.$inferSelect) {
  return {
    ...p,
    hourlyRate: p.hourlyRate ? parseFloat(p.hourlyRate) : null,
    publicEnabled: p.publicEnabled !== 0,
    updatedAt: p.updatedAt.toISOString(),
  };
}

async function getOrCreate(uid: string) {
  const [existing] = await db.select().from(profile).where(eq(profile.userId, uid)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(profile).values({ userId: uid }).returning();
  return created;
}

router.get("/profile", async (req, res) => {
  try {
    const uid = (req as AuthedRequest).userId;
    const p = await getOrCreate(uid);
    res.json(serialize(p));
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

router.put("/profile", async (req, res) => {
  try {
    const uid = (req as AuthedRequest).userId;
    const body = ProfileBody.parse(req.body);
    const existing = await getOrCreate(uid);
    const updates: Record<string, unknown> = {
      ...body,
      updatedAt: new Date(),
    };
    if (body.hourlyRate != null) updates.hourlyRate = String(body.hourlyRate);
    if (body.publicEnabled !== undefined) {
      updates.publicEnabled = body.publicEnabled ? 1 : 0;
    }
    // Generate / refresh a unique URL slug when we have a name.
    const nameForSlug = (body.displayName || existing.displayName || "").trim();
    if (nameForSlug && !existing.publicSlug) {
      updates.publicSlug = await uniqueSlug(nameForSlug, existing.id);
    }
    const [row] = await db
      .update(profile)
      .set(updates)
      .where(and(eq(profile.id, existing.id), eq(profile.userId, uid)))
      .returning();
    res.json(serialize(row));
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

export default router;
