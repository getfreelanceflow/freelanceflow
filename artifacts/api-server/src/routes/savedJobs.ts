import { Router } from "express";
import { db, savedJobs, jobs } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  SaveJobBody,
  DeleteSavedJobParams,
} from "@workspace/api-zod";
import { requireUser, type AuthedRequest } from "../lib/requireUser";

const router = Router();
router.use(requireUser);

router.get("/saved-jobs", async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const result = await db
      .select({
        id: savedJobs.id,
        jobId: savedJobs.jobId,
        savedAt: savedJobs.savedAt,
        job: {
          id: jobs.id,
          title: jobs.title,
          description: jobs.description,
          category: jobs.category,
          budgetMin: jobs.budgetMin,
          budgetMax: jobs.budgetMax,
          skills: jobs.skills,
          postedAt: jobs.postedAt,
          platform: jobs.platform,
          successScore: jobs.successScore,
          clientName: jobs.clientName,
          clientRating: jobs.clientRating,
        },
      })
      .from(savedJobs)
      .innerJoin(jobs, eq(savedJobs.jobId, jobs.id))
      .where(eq(savedJobs.userId, uid))
      .orderBy(savedJobs.savedAt);

    res.json(
      result.map((r) => ({
        ...r,
        savedAt: r.savedAt.toISOString(),
        job: {
          ...r.job,
          budgetMin: parseFloat(r.job.budgetMin),
          budgetMax: parseFloat(r.job.budgetMax),
          successScore: parseFloat(r.job.successScore),
          clientRating: r.job.clientRating ? parseFloat(r.job.clientRating) : null,
          postedAt: r.job.postedAt.toISOString(),
        },
      }))
    );
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

router.post("/saved-jobs", async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const body = SaveJobBody.parse(req.body);
    const [job] = await db.select().from(jobs).where(eq(jobs.id, body.jobId));
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    const [saved] = await db
      .insert(savedJobs)
      .values({ userId: uid, jobId: body.jobId })
      .returning();
    res.status(201).json({
      ...saved,
      savedAt: saved.savedAt.toISOString(),
      job: {
        ...job,
        budgetMin: parseFloat(job.budgetMin),
        budgetMax: parseFloat(job.budgetMax),
        successScore: parseFloat(job.successScore),
        clientRating: job.clientRating ? parseFloat(job.clientRating) : null,
        postedAt: job.postedAt.toISOString(),
      },
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

router.delete("/saved-jobs/:id", async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const { id } = DeleteSavedJobParams.parse({ id: parseInt(req.params.id) });
    const [deleted] = await db
      .delete(savedJobs)
      .where(and(eq(savedJobs.id, id), eq(savedJobs.userId, uid)))
      .returning();
    if (!deleted) {
      return res.status(404).json({ error: "Saved job not found" });
    }
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

export default router;
