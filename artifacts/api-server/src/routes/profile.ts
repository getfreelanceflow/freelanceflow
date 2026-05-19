import { Router } from "express";
import { db, profile } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const PortfolioItem = z.object({
  title: z.string(),
  description: z.string(),
  url: z.string().optional(),
  imageUrl: z.string().optional(),
});

const SocialLinks = z.object({
  website: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  twitter: z.string().optional(),
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
});

function serialize(p: typeof profile.$inferSelect) {
  return {
    ...p,
    hourlyRate: p.hourlyRate ? parseFloat(p.hourlyRate) : null,
    updatedAt: p.updatedAt.toISOString(),
  };
}

async function getOrCreate() {
  const [existing] = await db.select().from(profile).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(profile).values({}).returning();
  return created;
}

router.get("/profile", async (_req, res) => {
  try {
    const p = await getOrCreate();
    res.json(serialize(p));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/profile", async (req, res) => {
  try {
    const body = ProfileBody.parse(req.body);
    const existing = await getOrCreate();
    const updates: Record<string, unknown> = { ...body, updatedAt: new Date() };
    if (body.hourlyRate != null) updates.hourlyRate = String(body.hourlyRate);
    const [row] = await db.update(profile).set(updates).where(eq(profile.id, existing.id)).returning();
    res.json(serialize(row));
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

export default router;
