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
  profile,
  servicePackages,
  packageInquiries,
  packageReviews,
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

      const countFor = async (table: typeof clients | typeof profile | typeof servicePackages | typeof proposals): Promise<number> => {
        const r = await tx
          .select({ c: sql<number>`count(*)::int` })
          .from(table as typeof clients)
          .where(eq((table as typeof clients).userId, uid));
        return r[0]?.c ?? 0;
      };

      const hasClients = (await countFor(clients)) > 0;
      const hasProfile = (await countFor(profile)) > 0;
      const hasPackages = (await countFor(servicePackages)) > 0;
      const hasProposals = (await countFor(proposals)) > 0;

      let insertedClients: { id: number; name: string }[] = [];
      if (!hasClients) {
        insertedClients = await tx.insert(clients).values([
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
      } // end if (!hasClients)

      // ---- Profile (with public slug so /u/:slug works in demo) ----
      const slugBase = `demo-freelancer-${uid.slice(-6).toLowerCase().replace(/[^a-z0-9]/g, "") || "user"}`;
      if (!hasProfile) {
        await tx.insert(profile).values({
          userId: uid,
          publicSlug: slugBase,
          publicEnabled: 1,
          displayName: "Alex Morgan",
          headline: "Senior Full-Stack Developer · SaaS specialist",
          bio: "I help SaaS startups ship features 2x faster. 8 years of TypeScript, React, and Node experience — most recently at two YC-backed companies. I take projects from spec to production, including CI/CD, observability, and on-call.",
          skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "AWS", "System design"],
          hourlyRate: "150.00",
          yearsExperience: 8,
          location: "Remote · US/EU friendly",
          portfolioItems: [
            {
              title: "Realtime analytics dashboard",
              description: "Migrated a Series B SaaS to a streaming pipeline; cut p95 query latency from 4s to 180ms.",
              url: "https://example.com/case-acme",
            },
            {
              title: "Mobile checkout redesign",
              description: "Increased mobile conversion 27% for a DTC retailer by simplifying the checkout state machine.",
            },
          ],
          socialLinks: { website: "https://example.com", linkedin: "https://www.linkedin.com/in/example" },
        });
      }

      // ---- Service packages ----
      let insertedPkgs: { id: number }[] = [];
      if (!hasPackages) {
      insertedPkgs = await tx.insert(servicePackages).values([
        {
          userId: uid,
          slug: `${slugBase}-mvp-sprint`,
          title: "SaaS MVP in 4 weeks",
          tagline: "Ship your first paying-customer release fast.",
          description:
            "I'll build the core of your SaaS MVP — auth, billing, a clean dashboard, and the one feature your customers will pay for. Comes with a deployed app, CI/CD, and a 14-day post-launch warranty.",
          price: "8500.00",
          currency: "USD",
          deliveryDays: 28,
          revisions: 2,
          category: "Web development",
          deliverables: ["Deployed app", "Source code on GitHub", "CI/CD pipeline", "14-day bug warranty"],
          isPublic: true,
          tiers: [
            {
              name: "Starter",
              price: 4500,
              deliveryDays: 14,
              revisions: 1,
              deliverables: ["Landing page", "Email/password + Google auth", "1 dashboard view", "Deploy to Vercel"],
            },
            {
              name: "Standard",
              price: 8500,
              deliveryDays: 28,
              revisions: 2,
              deliverables: ["Everything in Starter", "Stripe billing", "3 dashboard views", "Admin panel", "CI/CD"],
            },
            {
              name: "Premium",
              price: 15000,
              deliveryDays: 42,
              revisions: 3,
              deliverables: [
                "Everything in Standard",
                "Sentry + analytics",
                "Background jobs",
                "End-to-end tests",
                "30-day post-launch support",
              ],
            },
          ],
          faqs: [
            { question: "Do you handle design too?", answer: "Yes — I use Tailwind + shadcn and tweak components to match your brand. For deep custom design I bring in a designer partner." },
            { question: "What stack do you use?", answer: "React + Vite + TypeScript on the frontend, Node/Express + PostgreSQL on the backend, deployed to Vercel or Replit." },
            { question: "What if I need changes after launch?", answer: "Every package includes a 14-day warranty on bugs. Beyond that I offer a retainer at my hourly rate." },
          ],
        },
        {
          userId: uid,
          slug: `${slugBase}-audit`,
          title: "Codebase audit & roadmap",
          tagline: "A senior set of eyes on your code in 5 days.",
          description:
            "I'll review your full stack — architecture, security, performance, DX — and deliver a written report with prioritized recommendations and a 30/60/90 roadmap.",
          price: "2500.00",
          currency: "USD",
          deliveryDays: 5,
          revisions: 1,
          category: "Consulting",
          deliverables: ["Written audit report (PDF)", "30/60/90 roadmap", "1-hour walkthrough call"],
          isPublic: true,
          tiers: [],
          faqs: [
            { question: "What do you need from me?", answer: "Read access to the repo, a 30-minute kickoff call, and access to staging if available." },
            { question: "Do you implement the fixes?", answer: "Not in this package — this is advisory. I can take on implementation as a follow-up engagement." },
          ],
        },
        {
          userId: uid,
          slug: `${slugBase}-perf`,
          title: "Performance optimization sprint",
          tagline: "Cut your page loads in half — guaranteed.",
          description:
            "A 2-week sprint focused on measurable performance wins: Core Web Vitals, API latency, bundle size, and database query plans. Comes with before/after metrics.",
          price: "5500.00",
          currency: "USD",
          deliveryDays: 14,
          revisions: 1,
          category: "Performance",
          deliverables: ["Before/after performance report", "Optimized code merged to main", "Runbook for future regressions"],
          isPublic: false,
          tiers: [],
          faqs: [],
        },
      ]).returning();

      // ---- Reviews on package 1 (published + 1 pending for moderation demo) ----
      if (insertedPkgs[0]) {
        await tx.insert(packageReviews).values([
          {
            packageId: insertedPkgs[0].id,
            userId: uid,
            authorName: "Marcus Johnson",
            authorEmail: "marcus@brightlabs.io",
            authorRole: "CTO at BrightLabs",
            rating: 5,
            comment:
              "Alex shipped our MVP in 25 days flat. The code is clean, well-documented, and we onboarded our first 50 paying users within a week of launch. Highest recommendation.",
            status: "published",
          },
          {
            packageId: insertedPkgs[0].id,
            userId: uid,
            authorName: "Sarah Chen",
            authorEmail: "sarah@acmecorp.com",
            authorRole: "Founder at Acme Corp",
            rating: 5,
            comment:
              "Professional, responsive, and shipped a production-grade product. The deployed app handled our launch-day spike without a single hiccup.",
            status: "published",
          },
          {
            packageId: insertedPkgs[0].id,
            userId: uid,
            authorName: "Priya Anand",
            authorEmail: "priya@example.com",
            authorRole: "Product Manager",
            rating: 4,
            comment:
              "Great execution overall. We had a couple of scope-clarification rounds in week 2 but Alex absorbed them gracefully. Would hire again.",
            status: "pending",
          },
        ]);
      }
      if (insertedPkgs[1]) {
        await tx.insert(packageReviews).values([
          {
            packageId: insertedPkgs[1].id,
            userId: uid,
            authorName: "Raj Patel",
            authorEmail: "raj@quantumsoft.com",
            authorRole: "VP Engineering at QuantumSoft",
            rating: 5,
            comment:
              "The audit report was the single most useful document we got that quarter. Found two critical security issues we'd missed and gave us a clear path forward.",
            status: "published",
          },
        ]);
      }

      // ---- Sample inquiries with AI triage already populated ----
      if (insertedPkgs[0]) {
        await tx.insert(packageInquiries).values([
          {
            packageId: insertedPkgs[0].id,
            userId: uid,
            name: "Elena Rodriguez",
            email: "elena@designhaus.co",
            message:
              "We're a 6-person agency about to spin out a SaaS product. Budget around $10k, want to launch in 6 weeks. Can we set up a call this week?",
            tier: "Standard",
            status: "new",
            aiLabel: "qualified",
            aiScore: 92,
            aiReason: "Clear budget ($10k), explicit timeline (6 weeks), and concrete scope (SaaS MVP).",
          },
          {
            packageId: insertedPkgs[0].id,
            userId: uid,
            name: "Curious Visitor",
            email: "info@gmail.com",
            message: "What does this cost? Just exploring options.",
            tier: null,
            status: "new",
            aiLabel: "exploratory",
            aiScore: 38,
            aiReason: "Vague — no budget, timeline, or scope indicated. Likely top-of-funnel.",
          },
          {
            packageId: insertedPkgs[0].id,
            userId: uid,
            name: "AAA SEO Services",
            email: "growth@seoboost.example",
            message:
              "Hi! We can rank your website #1 on Google in 30 days. Reply for our special offer. Discount 50% this week only!!!",
            tier: null,
            status: "new",
            aiLabel: "spam",
            aiScore: 4,
            aiReason: "Promotional outreach — not a genuine inquiry. Auto-mark as spam.",
          },
        ]);
      }
      } // end if (!hasPackages)

      let proposalsInserted = 0;
      let savedJobsInserted = 0;
      if (!hasProposals) {
      const someJobs = await tx.select({ id: jobs.id, title: jobs.title }).from(jobs).limit(8);
      if (someJobs.length > 0) {
        proposalsInserted = Math.min(3, someJobs.length);
        savedJobsInserted = Math.min(5, someJobs.length);
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
      } // end if (!hasProposals)

      const seededAnything =
        !hasClients || !hasProfile || !hasPackages || !hasProposals;
      return {
        skipped: !seededAnything,
        counts: {
          clients: !hasClients ? insertedClients.length : 0,
          invoices: !hasClients ? 7 : 0,
          tasks: !hasClients ? 10 : 0,
          expenses: !hasClients ? 8 : 0,
          goals: !hasClients ? 4 : 0,
          followups: !hasClients ? 4 : 0,
          timeEntries: !hasClients ? 5 : 0,
          templates: !hasClients ? 4 : 0,
          proposals: proposalsInserted,
          savedJobs: savedJobsInserted,
          profile: !hasProfile ? 1 : 0,
          servicePackages: insertedPkgs.length,
          reviews: !hasPackages ? 4 : 0,
          inquiries: !hasPackages ? 3 : 0,
        },
      };
    });

    if (result.skipped) {
      return res.json({ ok: true, skipped: true, message: "Nothing to seed — all demo data is already present." });
    }
    res.json({ ok: true, skipped: false, counts: result.counts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    console.error("seed-demo-data error:", msg);
    res.status(500).json({ error: "Failed to seed demo data" });
  }
});

export default router;
