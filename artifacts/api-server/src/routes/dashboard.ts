import { Router } from "express";
import { db, proposals, savedJobs, jobs, clients, invoices, tasks, timeEntries, expenses, goals } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { requireUser, type AuthedRequest } from "../lib/requireUser";

const router = Router();
router.use(requireUser);

router.get("/dashboard/summary", async (req, res) => {
  try {
    const uid = (req as AuthedRequest).userId;

    const [proposalTotals] = await db.select({ total: count() }).from(proposals).where(eq(proposals.userId, uid));
    const statusCounts = await db
      .select({ status: proposals.status, count: count() })
      .from(proposals)
      .where(eq(proposals.userId, uid))
      .groupBy(proposals.status);

    const [savedCount] = await db.select({ total: count() }).from(savedJobs).where(eq(savedJobs.userId, uid));
    const [clientCount] = await db.select({ total: count() }).from(clients).where(eq(clients.userId, uid));
    const [taskCount] = await db
      .select({ total: count() })
      .from(tasks)
      .where(sql`${tasks.userId} = ${uid} AND ${tasks.status} != 'done'`);

    const [earned] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.amount}), 0)` })
      .from(invoices)
      .where(sql`${invoices.userId} = ${uid} AND ${invoices.status} = 'paid'`);

    const [outstanding] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.amount}), 0)` })
      .from(invoices)
      .where(sql`${invoices.userId} = ${uid} AND ${invoices.status} IN ('sent', 'overdue')`);

    const [timeRow] = await db
      .select({
        totalHours: sql<string>`COALESCE(SUM(${timeEntries.hours}), 0)`,
        billableHours: sql<string>`COALESCE(SUM(CASE WHEN ${timeEntries.billable} THEN ${timeEntries.hours} ELSE 0 END), 0)`,
      })
      .from(timeEntries)
      .where(eq(timeEntries.userId, uid));

    const [expenseRow] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
        deductible: sql<string>`COALESCE(SUM(CASE WHEN ${expenses.taxDeductible} THEN ${expenses.amount} ELSE 0 END), 0)`,
      })
      .from(expenses)
      .where(eq(expenses.userId, uid));

    const [goalCount] = await db.select({ total: count() }).from(goals).where(eq(goals.userId, uid));

    const byStatus = { draft: 0, sent: 0, accepted: 0, rejected: 0 };
    for (const row of statusCounts) {
      const s = row.status as keyof typeof byStatus;
      if (s in byStatus) byStatus[s] = row.count;
    }

    const total = proposalTotals.total;
    const accepted = byStatus.accepted;
    const successRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    res.json({
      totalProposals: total,
      acceptedProposals: accepted,
      savedJobs: savedCount.total,
      successRate,
      proposalsByStatus: byStatus,
      clients: clientCount.total,
      openTasks: taskCount.total,
      totalEarned: parseFloat(earned.total),
      totalOutstanding: parseFloat(outstanding.total),
      totalHours: parseFloat(timeRow?.totalHours ?? "0"),
      billableHours: parseFloat(timeRow?.billableHours ?? "0"),
      totalExpenses: parseFloat(expenseRow?.total ?? "0"),
      deductibleExpenses: parseFloat(expenseRow?.deductible ?? "0"),
      activeGoals: goalCount.total,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/dashboard/recent-proposals", async (req, res) => {
  try {
    const uid = (req as AuthedRequest).userId;
    const result = await db
      .select()
      .from(proposals)
      .where(eq(proposals.userId, uid))
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
