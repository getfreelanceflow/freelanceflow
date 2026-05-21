import { Router } from "express";
import { db, jobs, clients, invoices, proposals } from "@workspace/db";
import { eq, and, or, ilike, sql, desc } from "drizzle-orm";
import { requireUser, type AuthedRequest } from "../lib/requireUser";

const router = Router();

interface Hit {
  id: number;
  title: string;
  subtitle: string | null;
  href: string;
}

router.get("/search", requireUser, async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const qRaw = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (qRaw.length === 0) {
      return res.json({ jobs: [], clients: [], invoices: [], proposals: [] });
    }
    const like = `%${qRaw}%`;

    const [jobHits, clientHits, invoiceHits, proposalHits] = await Promise.all([
      db
        .select({
          id: jobs.id,
          title: jobs.title,
          platform: jobs.platform,
          category: jobs.category,
        })
        .from(jobs)
        .where(
          or(
            ilike(jobs.title, like),
            ilike(jobs.category, like),
            ilike(jobs.platform, like),
            sql`EXISTS (SELECT 1 FROM unnest(${jobs.skills}) AS s WHERE s ILIKE ${like})`,
          ),
        )
        .orderBy(desc(jobs.postedAt))
        .limit(5),
      db
        .select({
          id: clients.id,
          name: clients.name,
          company: clients.company,
          status: clients.status,
        })
        .from(clients)
        .where(
          and(
            eq(clients.userId, uid),
            or(
              ilike(clients.name, like),
              ilike(clients.company, like),
              ilike(clients.email, like),
            ),
          ),
        )
        .limit(5),
      db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          clientName: invoices.clientName,
          status: invoices.status,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.userId, uid),
            or(
              ilike(invoices.invoiceNumber, like),
              ilike(invoices.clientName, like),
            ),
          ),
        )
        .limit(5),
      db
        .select({
          id: proposals.id,
          jobTitle: proposals.jobTitle,
          status: proposals.status,
        })
        .from(proposals)
        .where(
          and(
            eq(proposals.userId, uid),
            ilike(proposals.jobTitle, like),
          ),
        )
        .limit(5),
    ]);

    res.json({
      jobs: jobHits.map<Hit>((j) => ({
        id: j.id,
        title: j.title,
        subtitle: [j.platform, j.category].filter(Boolean).join(" • ") || null,
        href: `/jobs/${j.id}`,
      })),
      clients: clientHits.map<Hit>((c) => ({
        id: c.id,
        title: c.name,
        subtitle: [c.company, c.status].filter(Boolean).join(" • ") || null,
        href: `/clients`,
      })),
      invoices: invoiceHits.map<Hit>((i) => ({
        id: i.id,
        title: i.invoiceNumber,
        subtitle: [i.clientName, i.status].filter(Boolean).join(" • ") || null,
        href: `/invoices`,
      })),
      proposals: proposalHits.map<Hit>((p) => ({
        id: p.id,
        title: p.jobTitle,
        subtitle: p.status,
        href: `/proposals`,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Search failed" });
  }
});

export default router;
