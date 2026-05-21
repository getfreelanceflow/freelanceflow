import { Router } from "express";
import {
  db,
  clients,
  invoices,
  tasks,
  expenses,
  goals,
  followups,
  timeEntries,
  templates,
  proposals,
  savedJobs,
  jobs,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireUser, type AuthedRequest } from "../lib/requireUser";

const router = Router();
router.use(requireUser);

function daysFromNow(d: number): Date {
  return new Date(Date.now() + d * 86400000);
}

router.post("/seed-demo-data", async (req, res) => {
  try {
    const uid = (req as AuthedRequest).userId;

    const result = await db.transaction(async (tx) => {
      // Take an advisory lock keyed off the user id so concurrent calls serialize.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${uid}))`);

      const existing = await tx
        .select({ c: sql<number>`count(*)::int` })
        .from(clients)
        .where(eq(clients.userId, uid));
      if ((existing[0]?.c ?? 0) > 0) {
        return { skipped: true as const };
      }

      const insertedClients = await tx.insert(clients).values([
      { userId: uid, name: "Sarah Chen", email: "sarah@acmecorp.com", company: "Acme Corp", status: "active", hourlyRate: "125.00", notes: "Long-term client, prefers Slack" },
      { userId: uid, name: "Marcus Johnson", email: "marcus@brightlabs.io", company: "BrightLabs", status: "active", hourlyRate: "150.00", notes: "Series B startup, fast-moving" },
      { userId: uid, name: "Elena Rodriguez", email: "elena@designhaus.co", company: "DesignHaus", status: "lead", hourlyRate: "95.00", notes: "Found via LinkedIn" },
      { userId: uid, name: "Raj Patel", email: "raj@quantumsoft.com", company: "QuantumSoft", status: "active", hourlyRate: "175.00", notes: "Enterprise — net 30 terms" },
      { userId: uid, name: "Olivia Park", email: "olivia@foundersclub.com", company: "Founders Club", status: "past", hourlyRate: "110.00", notes: "Completed redesign Q2" },
      { userId: uid, name: "James Wilson", email: "james@northwind.tech", company: "Northwind Tech", status: "lead", notes: "Discovery call scheduled" },
      { userId: uid, name: "Aisha Okafor", email: "aisha@lumenanalytics.com", company: "Lumen Analytics", status: "active", hourlyRate: "140.00", notes: "ML pipeline project" },
    ]).returning();

    const c = insertedClients;

      await tx.insert(invoices).values([
      { userId: uid, clientId: c[0].id, clientName: c[0].name, invoiceNumber: "INV-1001", amount: "4500.00", status: "paid", dueDate: daysFromNow(-15), sentAt: daysFromNow(-30), paidAt: daysFromNow(-10), items: [{ description: "Frontend development — 30 hrs", quantity: 30, rate: 125 }, { description: "Code review — 6 hrs", quantity: 6, rate: 125 }] },
      { userId: uid, clientId: c[1].id, clientName: c[1].name, invoiceNumber: "INV-1002", amount: "7500.00", status: "paid", dueDate: daysFromNow(-5), sentAt: daysFromNow(-20), paidAt: daysFromNow(-3), items: [{ description: "API integration sprint", quantity: 50, rate: 150 }] },
      { userId: uid, clientId: c[3].id, clientName: c[3].name, invoiceNumber: "INV-1003", amount: "12250.00", status: "sent", dueDate: daysFromNow(14), sentAt: daysFromNow(-5), items: [{ description: "Architecture consulting — 70 hrs", quantity: 70, rate: 175 }] },
      { userId: uid, clientId: c[0].id, clientName: c[0].name, invoiceNumber: "INV-1004", amount: "3125.00", status: "sent", dueDate: daysFromNow(7), sentAt: daysFromNow(-2), items: [{ description: "Bug fixes and polish — 25 hrs", quantity: 25, rate: 125 }] },
      { userId: uid, clientId: c[6].id, clientName: c[6].name, invoiceNumber: "INV-1005", amount: "8400.00", status: "overdue", dueDate: daysFromNow(-8), sentAt: daysFromNow(-23), items: [{ description: "ML pipeline build — 60 hrs", quantity: 60, rate: 140 }] },
      { userId: uid, clientId: c[1].id, clientName: c[1].name, invoiceNumber: "INV-1006", amount: "6000.00", status: "draft", items: [{ description: "Feature work — TBD", quantity: 40, rate: 150 }] },
      { userId: uid, clientId: c[4].id, clientName: c[4].name, invoiceNumber: "INV-1007", amount: "5500.00", status: "paid", dueDate: daysFromNow(-60), sentAt: daysFromNow(-75), paidAt: daysFromNow(-55), items: [{ description: "Site redesign — final", quantity: 50, rate: 110 }] },
    ]);

      await tx.insert(tasks).values([
      { userId: uid, title: "Send weekly update to Sarah", description: "Include sprint demo link", status: "todo", priority: "high", clientId: c[0].id, dueDate: daysFromNow(1) },
      { userId: uid, title: "Refactor auth module", description: "Switch to session-based tokens", status: "in_progress", priority: "high", clientId: c[1].id, dueDate: daysFromNow(3) },
      { userId: uid, title: "Quarterly invoice review", status: "todo", priority: "medium", dueDate: daysFromNow(7) },
      { userId: uid, title: "Update portfolio site", description: "Add 3 new case studies", status: "todo", priority: "low", dueDate: daysFromNow(14) },
      { userId: uid, title: "Follow up with Elena (DesignHaus)", status: "todo", priority: "high", clientId: c[2].id, dueDate: daysFromNow(2) },
      { userId: uid, title: "Deploy v2 of dashboard", status: "in_progress", priority: "high", clientId: c[3].id, dueDate: daysFromNow(5) },
      { userId: uid, title: "Write proposal for Northwind", status: "todo", priority: "medium", clientId: c[5].id, dueDate: daysFromNow(4) },
      { userId: uid, title: "Backup project archives", status: "done", priority: "low" },
      { userId: uid, title: "Tax docs to accountant", status: "todo", priority: "high", dueDate: daysFromNow(10) },
      { userId: uid, title: "Train new ML model checkpoint", status: "in_progress", priority: "medium", clientId: c[6].id, dueDate: daysFromNow(6) },
    ]);

      await tx.insert(expenses).values([
      { userId: uid, description: "GitHub Pro subscription", amount: "21.00", category: "software", date: daysFromNow(-5), taxDeductible: true },
      { userId: uid, description: "Adobe Creative Cloud", amount: "59.99", category: "software", date: daysFromNow(-12), taxDeductible: true },
      { userId: uid, description: "Coffee meeting w/ Marcus", amount: "18.40", category: "meals", date: daysFromNow(-8), taxDeductible: true, notes: "BrightLabs kickoff" },
      { userId: uid, description: "Notion team plan", amount: "20.00", category: "software", date: daysFromNow(-3), taxDeductible: true },
      { userId: uid, description: "Web hosting (annual)", amount: "240.00", category: "hosting", date: daysFromNow(-45), taxDeductible: true },
      { userId: uid, description: "New monitor (LG 27\")", amount: "449.00", category: "equipment", date: daysFromNow(-22), taxDeductible: true },
      { userId: uid, description: "Co-working day pass", amount: "35.00", category: "office", date: daysFromNow(-1), taxDeductible: true },
      { userId: uid, description: "OpenAI API usage", amount: "127.43", category: "software", date: daysFromNow(-7), taxDeductible: true },
    ]);

      const monthStart = new Date(); monthStart.setDate(1);
      await tx.insert(goals).values([
      { userId: uid, title: "Monthly revenue target", type: "revenue", target: "15000.00", period: "month", startDate: monthStart, endDate: daysFromNow(20) },
      { userId: uid, title: "Bill 80 hours this month", type: "hours", target: "80.00", period: "month", startDate: monthStart, endDate: daysFromNow(20) },
      { userId: uid, title: "Land 2 new clients", type: "clients", target: "2.00", period: "month", startDate: monthStart, endDate: daysFromNow(20) },
      { userId: uid, title: "Annual revenue goal", type: "revenue", target: "150000.00", period: "year", startDate: new Date(new Date().getFullYear(), 0, 1) },
    ]);

      await tx.insert(followups).values([
      { userId: uid, clientId: c[2].id, title: "Send proposal to DesignHaus", notes: "Include 3-tier pricing", dueDate: daysFromNow(2) },
      { userId: uid, clientId: c[5].id, title: "Discovery call with Northwind", notes: "Tuesday 2pm", dueDate: daysFromNow(4) },
      { userId: uid, clientId: c[6].id, title: "Check on Lumen invoice", notes: "INV-1005 is overdue", dueDate: daysFromNow(1) },
      { userId: uid, clientId: c[0].id, title: "Quarterly review with Acme", dueDate: daysFromNow(21) },
    ]);

      await tx.insert(timeEntries).values([
      { userId: uid, clientId: c[0].id, description: "Frontend dashboard refactor", startedAt: daysFromNow(-1), endedAt: new Date(daysFromNow(-1).getTime() + 3.5 * 3600000), hours: "3.5", rate: "125.00", billable: true },
      { userId: uid, clientId: c[1].id, description: "API integration debugging", startedAt: daysFromNow(-2), endedAt: new Date(daysFromNow(-2).getTime() + 2 * 3600000), hours: "2.0", rate: "150.00", billable: true },
      { userId: uid, clientId: c[3].id, description: "Architecture review meeting", startedAt: daysFromNow(-3), endedAt: new Date(daysFromNow(-3).getTime() + 1.5 * 3600000), hours: "1.5", rate: "175.00", billable: true },
      { userId: uid, clientId: c[6].id, description: "ML model training & eval", startedAt: daysFromNow(-1), endedAt: new Date(daysFromNow(-1).getTime() + 4 * 3600000), hours: "4.0", rate: "140.00", billable: true },
      { userId: uid, description: "Admin / invoicing", startedAt: daysFromNow(-4), endedAt: new Date(daysFromNow(-4).getTime() + 1 * 3600000), hours: "1.0", billable: false },
    ]);

      await tx.insert(templates).values([
      { userId: uid, name: "Cold outreach — SaaS", category: "outreach", content: "Hi {{name}},\n\nI noticed {{company}} is expanding its product team. I help SaaS companies ship features 2x faster with senior-level fullstack work.\n\nWorth a quick call?\n\n— {{me}}" },
      { userId: uid, name: "Proposal — fixed scope", category: "proposal", content: "## Project: {{project}}\n\n**Scope:** {{scope}}\n**Timeline:** {{timeline}}\n**Investment:** {{price}}\n\nDeliverables:\n- ...\n\nPayment: 50% up front, 50% on delivery." },
      { userId: uid, name: "Follow-up — no response", category: "followup", content: "Hi {{name}},\n\nJust bumping this up — happy to jump on a 15 min call if helpful. Let me know what works.\n\n— {{me}}" },
      { userId: uid, name: "Invoice email", category: "invoice", content: "Hi {{name}},\n\nAttached is invoice {{invoiceNumber}} for {{amount}}, due {{dueDate}}.\n\nLet me know if you have any questions.\n\nThanks!\n— {{me}}" },
    ]);

      const someJobs = await tx.select({ id: jobs.id, title: jobs.title }).from(jobs).limit(8);
      if (someJobs.length > 0) {
        await tx.insert(proposals).values(
          someJobs.slice(0, 3).map((j, i) => ({
            userId: uid,
            jobId: j.id,
            jobTitle: j.title,
            content: `Hi there,\n\nI'd love to work on "${j.title}". I bring 8+ years of relevant experience...\n\nHappy to discuss details.\n\nThanks!`,
            status: (["draft", "sent", "sent"][i] ?? "draft"),
            successProbability: ["68.00", "72.50", "81.00"][i] ?? null,
          })),
        );
        await tx.insert(savedJobs).values(
          someJobs.slice(0, 5).map((j) => ({ userId: uid, jobId: j.id })),
        );
      }

      return {
        skipped: false as const,
        counts: {
          clients: c.length,
          invoices: 7,
          tasks: 10,
          expenses: 8,
          goals: 4,
          followups: 4,
          timeEntries: 5,
          templates: 4,
          proposals: Math.min(3, someJobs.length),
          savedJobs: Math.min(5, someJobs.length),
        },
      };
    });

    if (result.skipped) {
      return res.json({ ok: true, skipped: true, message: "You already have data — skipping seed." });
    }
    res.json({ ok: true, skipped: false, counts: result.counts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    console.error("seed-demo-data error:", msg);
    res.status(500).json({ error: "Failed to seed demo data" });
  }
});

export default router;
