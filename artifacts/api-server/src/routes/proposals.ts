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

const router = Router();
router.use(requireUser);

router.get("/proposals", async (req, res) => {
  try {
    const uid = (req as AuthedRequest).userId;
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
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }))
    );
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/proposals", async (req, res) => {
  try {
    const uid = (req as AuthedRequest).userId;
    const body = CreateProposalBody.parse(req.body);

    let jobTitle = body.jobTitle;
    if (body.jobId) {
      const [job] = await db.select().from(jobs).where(eq(jobs.id, body.jobId));
      if (job) jobTitle = job.title;
    }

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
      model: "gpt-5.4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 1024,
    });

    const content =
      completion.choices[0]?.message?.content ?? "Unable to generate proposal.";

    const successScore = Math.floor(Math.random() * 25) + 65;

    const [proposal] = await db
      .insert(proposals)
      .values({
        userId: uid,
        jobId: body.jobId ?? null,
        jobTitle,
        content,
        status: "draft",
        successProbability: String(successScore),
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
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/proposals/:id", async (req, res) => {
  try {
    const uid = (req as AuthedRequest).userId;
    const { id } = GetProposalParams.parse({ id: parseInt(req.params.id) });
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
    res.status(400).json({ error: String(e) });
  }
});

router.delete("/proposals/:id", async (req, res) => {
  try {
    const uid = (req as AuthedRequest).userId;
    const { id } = DeleteProposalParams.parse({ id: parseInt(req.params.id) });
    const [deleted] = await db
      .delete(proposals)
      .where(and(eq(proposals.id, id), eq(proposals.userId, uid)))
      .returning();
    if (!deleted) {
      return res.status(404).json({ error: "Proposal not found" });
    }
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

export default router;
