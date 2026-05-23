import { Router } from "express";
import { ZodError, z } from "zod";
import { db, jobs } from "@workspace/db";
import { eq, and, gte, lte, sql, ilike, or, desc, type SQL } from "drizzle-orm";
import {
  ListJobsQueryParams,
  GetJobParams,
} from "@workspace/api-zod";
import { isZipQuery, resolveZip } from "../lib/zipLookup";
import { requireUser, type AuthedRequest } from "../lib/requireUser";

const CreateJobBodySchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  category: z.string().min(1).max(80),
  budgetMin: z.number().nonnegative(),
  budgetMax: z.number().nonnegative(),
  skills: z.array(z.string().min(1).max(50)).max(20).default([]),
  jobType: z.enum(["remote", "onsite", "hybrid"]).default("remote"),
  location: z.string().max(200).optional().nullable(),
  applyUrl: z.string().url().max(500).optional().nullable(),
  contactEmail: z.string().email().max(200).optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  clientName: z.string().max(120).optional().nullable(),
});

function serializeJob(
  j: typeof jobs.$inferSelect,
  opts: { includeOwnerId?: boolean } = {},
) {
  const { postedByUserId, ...rest } = j;
  return {
    ...rest,
    budgetMin: parseFloat(j.budgetMin),
    budgetMax: parseFloat(j.budgetMax),
    successScore: parseFloat(j.successScore),
    clientRating: j.clientRating ? parseFloat(j.clientRating) : null,
    // Only expose owner ID on owner-scoped responses; never in public feed.
    ...(opts.includeOwnerId ? { postedByUserId } : {}),
    // Always indicate whether a job is community-posted so the UI can badge it
    // without leaking the actual user ID.
    isCommunityPosted: postedByUserId !== null,
  };
}

const router = Router();

// Common search synonyms — expands a single token into related terms so users
// searching for "javascript" also see Node/TypeScript jobs, etc.
const SEARCH_SYNONYMS: Record<string, string[]> = {
  javascript: ["javascript", "js", "node", "typescript", "react", "vue", "next"],
  js: ["js", "javascript", "node", "typescript"],
  typescript: ["typescript", "ts", "javascript", "node"],
  ts: ["ts", "typescript", "javascript"],
  node: ["node", "nodejs", "javascript", "express"],
  nodejs: ["nodejs", "node", "javascript"],
  react: ["react", "reactjs", "next", "javascript"],
  reactjs: ["reactjs", "react"],
  python: ["python", "django", "flask", "fastapi"],
  ai: ["ai", "ml", "machine learning", "llm", "openai", "gpt"],
  ml: ["ml", "ai", "machine learning"],
  designer: ["designer", "design", "ui", "ux", "figma"],
  design: ["design", "designer", "ui", "ux", "figma"],
  writer: ["writer", "writing", "copywriting", "content"],
  writing: ["writing", "writer", "copywriting", "content"],
  marketing: ["marketing", "seo", "growth", "ads"],
  mobile: ["mobile", "ios", "android", "react native", "flutter"],
  ios: ["ios", "swift", "mobile"],
  android: ["android", "kotlin", "mobile"],
};

function expandSearchTerm(input: string): string[] {
  const tokens = input
    .toLowerCase()
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const expanded = new Set<string>();
  // Always include the full original phrase (handles multi-word matches like "case study")
  const fullPhrase = input.trim();
  if (fullPhrase.length > 0) expanded.add(fullPhrase);

  for (const tok of tokens) {
    expanded.add(tok);
    const syns = SEARCH_SYNONYMS[tok];
    if (syns) {
      for (const s of syns) expanded.add(s);
    }
  }
  return [...expanded];
}

router.get("/jobs", async (req, res) => {
  try {
    const query = ListJobsQueryParams.parse(req.query);
    const conditions: SQL[] = [];

    if (query.category && query.category !== "all") {
      conditions.push(ilike(jobs.category, `%${query.category}%`));
    }
    if (query.minBudget !== undefined) {
      conditions.push(gte(jobs.budgetMin, String(query.minBudget)));
    }
    if (query.maxBudget !== undefined) {
      conditions.push(lte(jobs.budgetMax, String(query.maxBudget)));
    }
    if (query.search) {
      const terms = expandSearchTerm(query.search);
      const perTermConds: SQL[] = [];
      for (const t of terms) {
        const like = `%${t}%`;
        const cond = or(
          ilike(jobs.title, like),
          ilike(jobs.description, like),
          ilike(jobs.category, like),
          ilike(jobs.platform, like),
          ilike(jobs.clientName, like),
          sql`EXISTS (SELECT 1 FROM unnest(${jobs.skills}) AS s WHERE s ILIKE ${like})`,
        );
        if (cond) perTermConds.push(cond);
      }
      if (perTermConds.length > 0) {
        const combined = or(...perTermConds);
        if (combined) conditions.push(combined);
      }
    }
    if (query.platform) {
      conditions.push(ilike(jobs.platform, `%${query.platform}%`));
    }
    if (query.jobType && query.jobType !== "any") {
      conditions.push(eq(jobs.jobType, query.jobType));
    }
    if (query.location) {
      const raw = query.location.trim();
      const locTerms = new Set<string>();
      // Always include the original (handles partial city, "remote", etc.)
      if (raw.length > 0) locTerms.add(raw);
      // ZIP → city + state expansion
      if (isZipQuery(raw)) {
        const { city, state } = resolveZip(raw);
        if (city) locTerms.add(city);
        if (state) locTerms.add(state);
      }
      const locConds: SQL[] = [];
      for (const t of locTerms) {
        locConds.push(ilike(jobs.location, `%${t}%`));
      }
      // Treat "remote" search as also matching jobType=remote (since remote
      // jobs often have empty/null location strings).
      if (raw.toLowerCase() === "remote") {
        locConds.push(eq(jobs.jobType, "remote"));
      }
      const combined = or(...locConds);
      if (combined) conditions.push(combined);
    }
    if (query.postedWithin && query.postedWithin !== "any") {
      const hoursMap: Record<string, number> = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 };
      const hours = hoursMap[query.postedWithin];
      if (hours) {
        conditions.push(sql`${jobs.postedAt} >= NOW() - (${hours} * INTERVAL '1 hour')`);
      }
    }

    const result = await db
      .select()
      .from(jobs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${jobs.postedAt} DESC`);

    res.json(result.map((j) => serializeJob(j)));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to list jobs";
    console.error("[jobs] list error:", msg);
    const status = e instanceof ZodError ? 400 : 500;
    res.status(status).json({ error: msg });
  }
});

// List jobs posted by the current user
router.get("/jobs/mine", requireUser, async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const result = await db
      .select()
      .from(jobs)
      .where(eq(jobs.postedByUserId, uid))
      .orderBy(desc(jobs.postedAt));
    res.json(result.map((j) => serializeJob(j, { includeOwnerId: true })));
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Failed to list your jobs" });
  }
});

// Create a community-posted job
router.post("/jobs", requireUser, async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const body = CreateJobBodySchema.parse(req.body);

    if (body.budgetMax < body.budgetMin) {
      return res.status(400).json({ error: "Maximum budget must be greater than or equal to minimum budget" });
    }

    const [row] = await db
      .insert(jobs)
      .values({
        title: body.title.trim(),
        description: body.description.trim(),
        category: body.category.trim(),
        budgetMin: String(body.budgetMin),
        budgetMax: String(body.budgetMax),
        skills: body.skills.map((s) => s.trim()).filter(Boolean),
        platform: "Community",
        successScore: "0",
        clientName: body.clientName?.trim() || null,
        jobType: body.jobType,
        location: body.location?.trim() || null,
        applyUrl: body.applyUrl?.trim() || null,
        contactEmail: body.contactEmail?.trim() || null,
        contactPhone: body.contactPhone?.trim() || null,
        postedByUserId: uid,
      })
      .returning();

    res.status(201).json(serializeJob(row, { includeOwnerId: true }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create job";
    const status = e instanceof ZodError ? 400 : 500;
    res.status(status).json({ error: msg });
  }
});

// Delete one of your own posted jobs
router.delete("/jobs/:id", requireUser, async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const [row] = await db
      .delete(jobs)
      .where(and(eq(jobs.id, id), eq(jobs.postedByUserId, uid)))
      .returning();
    if (!row) return res.status(404).json({ error: "Job not found or not owned by you" });
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Failed to delete job" });
  }
});

router.get("/jobs/:id", async (req, res) => {
  try {
    const { id } = GetJobParams.parse({ id: parseInt(req.params.id) });
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.json(serializeJob(job));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch job";
    console.error("[jobs] get error:", msg);
    const status = e instanceof ZodError ? 400 : 500;
    res.status(status).json({ error: msg });
  }
});

export default router;
