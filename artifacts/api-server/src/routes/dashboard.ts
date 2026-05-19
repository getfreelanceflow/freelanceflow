import { Router } from "express";
import { db, proposals, savedJobs, jobs } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (_req, res) => {
  try {
    const [totals] = await db
      .select({ total: count() })
      .from(proposals);

    const statusCounts = await db
      .select({ status: proposals.status, count: count() })
      .from(proposals)
      .groupBy(proposals.status);

    const [savedCount] = await db
      .select({ total: count() })
      .from(savedJobs);

    const byStatus = { draft: 0, sent: 0, accepted: 0, rejected: 0 };
    for (const row of statusCounts) {
      const s = row.status as keyof typeof byStatus;
      if (s in byStatus) byStatus[s] = row.count;
    }

    const total = totals.total;
    const accepted = byStatus.accepted;
    const successRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    res.json({
      totalProposals: total,
      acceptedProposals: accepted,
      savedJobs: savedCount.total,
      successRate,
      proposalsByStatus: byStatus,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/dashboard/recent-proposals", async (_req, res) => {
  try {
    const result = await db
      .select()
      .from(proposals)
      .orderBy(sql`${proposals.createdAt} DESC`)
      .limit(5);

    res.json(
      result.map((p) => ({
        ...p,
        successProbability: p.successProbability
          ? parseFloat(p.successProbability)
          : null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }))
    );
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/dashboard/top-jobs", async (_req, res) => {
  try {
    const result = await db
      .select()
      .from(jobs)
      .orderBy(sql`${jobs.successScore} DESC`)
      .limit(6);

    res.json(
      result.map((j) => ({
        ...j,
        budgetMin: parseFloat(j.budgetMin),
        budgetMax: parseFloat(j.budgetMax),
        successScore: parseFloat(j.successScore),
        clientRating: j.clientRating ? parseFloat(j.clientRating) : null,
        postedAt: j.postedAt.toISOString(),
      }))
    );
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
