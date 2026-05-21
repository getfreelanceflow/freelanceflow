import { Router } from "express";
import { db, invoices, followups, jobs, profile } from "@workspace/db";
import { eq, and, lte, desc, sql } from "drizzle-orm";
import { requireUser, type AuthedRequest } from "../lib/requireUser";

const router = Router();

interface Notification {
  id: string;
  kind:
    | "invoice_overdue"
    | "invoice_due_soon"
    | "followup_due"
    | "job_match"
    | "welcome";
  title: string;
  body: string;
  href: string;
  createdAt: string;
}

router.get("/notifications", requireUser, async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const out: Notification[] = [];
    const now = new Date();
    const inSevenDays = new Date(now.getTime() + 7 * 24 * 3600_000);

    // 1. Overdue + due-soon invoices
    const dueInvoices = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, uid),
          sql`${invoices.status} IN ('sent','overdue')`,
          sql`${invoices.dueDate} IS NOT NULL`,
          lte(invoices.dueDate, inSevenDays),
        ),
      )
      .orderBy(invoices.dueDate)
      .limit(20);

    for (const inv of dueInvoices) {
      if (!inv.dueDate) continue;
      const overdue = inv.dueDate < now;
      out.push({
        id: `invoice-${inv.id}`,
        kind: overdue ? "invoice_overdue" : "invoice_due_soon",
        title: overdue
          ? `Invoice ${inv.invoiceNumber} is overdue`
          : `Invoice ${inv.invoiceNumber} due soon`,
        body: `${inv.clientName} • $${parseFloat(inv.amount).toLocaleString()} • due ${inv.dueDate.toLocaleDateString()}`,
        href: "/invoices",
        createdAt: inv.dueDate.toISOString(),
      });
    }

    // 2. Follow-ups due
    const dueFollowups = await db
      .select()
      .from(followups)
      .where(
        and(
          eq(followups.userId, uid),
          eq(followups.completed, false),
          lte(followups.dueDate, now),
        ),
      )
      .orderBy(followups.dueDate)
      .limit(20);

    for (const f of dueFollowups) {
      out.push({
        id: `followup-${f.id}`,
        kind: "followup_due",
        title: `Follow-up: ${f.title}`,
        body: f.notes ?? `Due ${f.dueDate.toLocaleDateString()}`,
        href: "/followups",
        createdAt: f.dueDate.toISOString(),
      });
    }

    // 3. Job matches based on profile skills
    const [userProfile] = await db
      .select()
      .from(profile)
      .where(eq(profile.userId, uid))
      .limit(1);

    const userSkills: string[] = Array.isArray(userProfile?.skills)
      ? (userProfile!.skills as string[])
      : [];

    if (userSkills.length > 0) {
      // Find jobs posted in the last 7 days that share at least one skill
      const skillsArrayLiteral = sql`ARRAY[${sql.join(
        userSkills.slice(0, 10).map((s) => sql`${s}`),
        sql`, `,
      )}]::text[]`;

      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600_000);
      const matches = await db
        .select({
          id: jobs.id,
          title: jobs.title,
          platform: jobs.platform,
          successScore: jobs.successScore,
          postedAt: jobs.postedAt,
        })
        .from(jobs)
        .where(
          and(
            sql`${jobs.skills} && ${skillsArrayLiteral}`,
            sql`${jobs.postedAt} >= ${sevenDaysAgo}`,
          ),
        )
        .orderBy(desc(jobs.postedAt))
        .limit(3);

      for (const m of matches) {
        out.push({
          id: `job-${m.id}`,
          kind: "job_match",
          title: `New match: ${m.title}`,
          body: `${m.platform} • ${parseFloat(m.successScore)}% match`,
          href: `/jobs/${m.id}`,
          createdAt: m.postedAt.toISOString(),
        });
      }
    } else if (out.length === 0) {
      out.push({
        id: "welcome",
        kind: "welcome",
        title: "Welcome to FreelanceFlow",
        body: "Set your skills on your Profile to start getting job matches here.",
        href: "/profile",
        createdAt: now.toISOString(),
      });
    }

    // Sort newest first
    out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    res.json(out);
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : "Failed to load notifications",
    });
  }
});

export default router;
