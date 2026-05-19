import { Router } from "express";
import { db, jobs } from "@workspace/db";
import { eq, and, gte, lte, sql, ilike } from "drizzle-orm";
import {
  ListJobsQueryParams,
  GetJobParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/jobs", async (req, res) => {
  try {
    const query = ListJobsQueryParams.parse(req.query);
    let conditions: ReturnType<typeof eq>[] = [];

    if (query.category) {
      conditions.push(eq(jobs.category, query.category));
    }
    if (query.minBudget !== undefined) {
      conditions.push(gte(jobs.budgetMin, String(query.minBudget)));
    }
    if (query.maxBudget !== undefined) {
      conditions.push(lte(jobs.budgetMax, String(query.maxBudget)));
    }

    let result = await db
      .select()
      .from(jobs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${jobs.postedAt} DESC`);

    if (query.search) {
      const search = query.search.toLowerCase();
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(search) ||
          j.description.toLowerCase().includes(search)
      );
    }

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
    res.status(400).json({ error: String(e) });
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
    res.status(400).json({ error: String(e) });
  }
});

export default router;
