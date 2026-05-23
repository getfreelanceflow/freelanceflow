import { Router } from "express";
import { ZodError } from "zod";
import { db, jobs } from "@workspace/db";
import { eq, and, gte, lte, sql, ilike, or, type SQL } from "drizzle-orm";
import {
  ListJobsQueryParams,
  GetJobParams,
} from "@workspace/api-zod";
import { isZipQuery, resolveZip } from "../lib/zipLookup";

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

    res.json(
      result.map((j) => ({
        ...j,
        budgetMin: parseFloat(j.budgetMin),
        budgetMax: parseFloat(j.budgetMax),
        successScore: parseFloat(j.successScore),
        clientRating: j.clientRating ? parseFloat(j.clientRating) : null,
      }))
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to list jobs";
    console.error("[jobs] list error:", msg);
    const status = e instanceof ZodError ? 400 : 500;
    res.status(status).json({ error: msg });
  }
});

router.get("/jobs/:id", async (req, res) => {
  try {
    const { id } = GetJobParams.parse({ id: parseInt(req.params.id) });
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.json({
      ...job,
      budgetMin: parseFloat(job.budgetMin),
      budgetMax: parseFloat(job.budgetMax),
      successScore: parseFloat(job.successScore),
      clientRating: job.clientRating ? parseFloat(job.clientRating) : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch job";
    console.error("[jobs] get error:", msg);
    const status = e instanceof ZodError ? 400 : 500;
    res.status(status).json({ error: msg });
  }
});

export default router;
