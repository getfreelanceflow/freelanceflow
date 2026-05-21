import { Router } from "express";
import { ZodError } from "zod";
import { db, jobs } from "@workspace/db";
import { eq, and, gte, lte, sql, ilike, or, type SQL } from "drizzle-orm";
import {
  ListJobsQueryParams,
  GetJobParams,
} from "@workspace/api-zod";

const router = Router();

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
      const term = `%${query.search}%`;
      const searchCond = or(
        ilike(jobs.title, term),
        ilike(jobs.description, term),
        ilike(jobs.category, term),
        ilike(jobs.platform, term),
        ilike(jobs.clientName, term),
        sql`EXISTS (SELECT 1 FROM unnest(${jobs.skills}) AS s WHERE s ILIKE ${term})`,
      );
      if (searchCond) conditions.push(searchCond);
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
