import { Router } from "express";
import { db, proposals, jobs } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  GetProposalParams,
  DeleteProposalParams,
  CreateProposalBody,
} from "@workspace/api-zod";
import { requireUser, type AuthedRequest } from "../lib/requireUser";
import { consumeCredits, refundCredits } from "../lib/billing";
import { AI_COSTS } from "../lib/aiCosts";

const router = Router();
router.use(requireUser);

router.get("/proposals", async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const result = await db
      .select()
      .from(proposals)
      .where(eq(proposals.userId, uid))
      .orderBy(proposals.createdAt);
    res.json(
      result.map((p) => ({
        ...p,
        successProbability: p.successProbability
          ? parseFloat(p.successProbability)
          : null,
        keywords: p.keywords ?? [],
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }))
    );
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

router.post("/proposals", async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const body = CreateProposalBody.parse(req.body);

    let jobTitle = body.jobTitle;
    if (body.jobId) {
      const [job] = await db.select().from(jobs).where(eq(jobs.id, body.jobId));
      if (job) jobTitle = job.title;
    }

    let content: string;
    let successScore: number;
    let creditTxId: string | null = null;
    const proposalCost = AI_COSTS.proposal_create;

    if (body.content && body.content.trim().length > 0) {
      // Caller (Studio) already generated the content — just persist.
      content = body.content;
      successScore = Math.floor(Math.random() * 20) + 70;
    } else {
      const gate = await consumeCredits(uid, proposalCost, "proposal_create");
      if (!gate.ok) {
        return res.status(402).json({
          error: "insufficient_credits",
          message: "Out of AI credits. Upgrade or buy a credit pack to continue.",
          needed: gate.needed,
          have: gate.have,
          action: "proposal_create",
        });
      }
      creditTxId = gate.txId;

      const systemPrompt = `You are FreelanceFlow AI, an expert freelance career assistant that writes high-converting proposals and helps users win more jobs. Write compelling, personalized, professional proposals that showcase the freelancer's skills and match the client's needs.`;

      const userPrompt = `Write a winning freelance proposal for the following job:

Job Title: ${jobTitle}
Job Description: ${body.jobDescription}
My Skills: ${body.mySkills}
${body.budget ? `My Rate: ${body.budget}` : ""}
${body.tone ? `Tone: ${body.tone}` : "Tone: Professional and confident"}

Write a complete, personalized proposal that:
1. Opens with a compelling hook that shows you understand the client's problem
2. Highlights relevant experience and skills
3. Proposes a clear approach/solution
4. Mentions timeline and deliverables
5. Closes with a strong CTA

Keep it under 300 words. Make it feel genuine, not generic.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 1024,
      });

      content = completion.choices[0]?.message?.content ?? "Unable to generate proposal.";
      successScore = Math.floor(Math.random() * 25) + 65;
    }

    // Wrap downstream errors so we can refund a consumed credit.
    const persist = async () => {

    const [proposal] = await db
      .insert(proposals)
      .values({
        userId: uid,
        jobId: body.jobId ?? null,
        jobTitle,
        content,
        status: "draft",
        successProbability: String(successScore),
        tone: body.tone ?? null,
        length: body.length ?? null,
        clientName: body.clientName ?? null,
        keywords: body.keywords ?? [],
        aiAnalysis: body.aiAnalysis
          ? {
              clientName: body.aiAnalysis.clientName ?? null,
              scamRisk: body.aiAnalysis.scamRisk,
              scamReasons: body.aiAnalysis.scamReasons,
              budget: {
                level: body.aiAnalysis.budget.level,
                estimate: body.aiAnalysis.budget.estimate ?? null,
              },
              urgency: body.aiAnalysis.urgency,
              keywords: body.aiAnalysis.keywords,
              fitScore: body.aiAnalysis.fitScore,
              fitReason: body.aiAnalysis.fitReason,
            }
          : null,
      })
      .returning();

    res.status(201).json({
      ...proposal,
      successProbability: proposal.successProbability
        ? parseFloat(proposal.successProbability)
        : null,
      createdAt: proposal.createdAt.toISOString(),
      updatedAt: proposal.updatedAt.toISOString(),
    });
    };
    try {
      await persist();
    } catch (innerErr) {
      if (creditTxId) {
        refundCredits(uid, proposalCost, creditTxId, "proposal_create_refund").catch(() => {});
      }
      throw innerErr;
    }
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

router.get("/proposals/:id", async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(404).json({ error: "Proposal not found" });
    }
    const { id } = GetProposalParams.parse({ id: parseInt(req.params.id, 10) });
    const [proposal] = await db
      .select()
      .from(proposals)
      .where(and(eq(proposals.id, id), eq(proposals.userId, uid)));
    if (!proposal) {
      return res.status(404).json({ error: "Proposal not found" });
    }
    res.json({
      ...proposal,
      successProbability: proposal.successProbability
        ? parseFloat(proposal.successProbability)
        : null,
      createdAt: proposal.createdAt.toISOString(),
      updatedAt: proposal.updatedAt.toISOString(),
    });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

router.delete("/proposals/:id", async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(404).json({ error: "Proposal not found" });
    }
    const { id } = DeleteProposalParams.parse({ id: parseInt(req.params.id, 10) });
    const [deleted] = await db
      .delete(proposals)
      .where(and(eq(proposals.id, id), eq(proposals.userId, uid)))
      .returning();
    if (!deleted) {
      return res.status(404).json({ error: "Proposal not found" });
    }
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

export default router;
