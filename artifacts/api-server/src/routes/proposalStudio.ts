import { Router } from "express";
import { db, proposalTemplates, type ProposalAnalysis } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { z, ZodError } from "zod";
import { requireUser, type AuthedRequest } from "../lib/requireUser";

const router = Router();
router.use(requireUser);

function handleZod(e: unknown, res: import("express").Response): boolean {
  if (e instanceof ZodError) {
    res.status(400).json({ error: "Invalid request", details: e.flatten() });
    return true;
  }
  return false;
}

function extractJson(raw: string): unknown | null {
  if (!raw) return null;
  let cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract first {...} or [...] block
    const m = cleaned.match(/[\{\[][\s\S]*[\}\]]/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Calls the LLM, parses + validates JSON against a Zod schema. Retries once
 * with a stricter "JSON ONLY" prompt if parse/validation fails. Returns null
 * if everything fails (caller decides the fallback).
 */
async function chatJsonValidated<T extends z.ZodTypeAny>(
  system: string,
  user: string,
  schema: T,
  maxTokens = 1200
): Promise<z.infer<T> | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt =
      attempt === 0
        ? user
        : `${user}\n\nIMPORTANT: Your previous response could not be parsed. Return ONLY a single valid JSON object that exactly matches the schema. No markdown, no commentary, no code fences.`;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: maxTokens,
      });
      const raw = completion.choices[0]?.message?.content ?? "";
      const parsed = extractJson(raw);
      if (!parsed) continue;
      const validated = schema.safeParse(parsed);
      if (validated.success) return validated.data;
    } catch (err) {
      console.error("[chatJsonValidated] attempt failed:", err);
    }
  }
  return null;
}

async function chatText(system: string, user: string, maxTokens = 1200): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_completion_tokens: maxTokens,
  });
  return completion.choices[0]?.message?.content?.trim() ?? "";
}

const analysisSchema = z.object({
  clientName: z.string().nullable().optional(),
  scamRisk: z.enum(["none", "low", "medium", "high"]).optional(),
  scamReasons: z.array(z.string()).optional(),
  budget: z
    .object({
      level: z.enum(["low", "medium", "high", "unknown"]).optional(),
      estimate: z.string().nullable().optional(),
    })
    .optional(),
  urgency: z.enum(["low", "medium", "high"]).optional(),
  keywords: z.array(z.string()).optional(),
  fitScore: z.number().optional(),
  fitReason: z.string().optional(),
});

function normalizeAnalysis(a: z.infer<typeof analysisSchema> | null): ProposalAnalysis {
  return {
    clientName: a?.clientName ?? null,
    scamRisk: a?.scamRisk ?? "none",
    scamReasons: a?.scamReasons ?? [],
    budget: {
      level: a?.budget?.level ?? "unknown",
      estimate: a?.budget?.estimate ?? null,
    },
    urgency: a?.urgency ?? "low",
    keywords: (a?.keywords ?? []).slice(0, 8),
    fitScore: Math.max(0, Math.min(100, Math.round(a?.fitScore ?? 50))),
    fitReason: a?.fitReason ?? "",
  };
}

const toneInstructions: Record<string, string> = {
  professional: "Professional, confident, polished. Industry-appropriate vocabulary.",
  casual: "Casual, warm, conversational. Like talking to a peer over coffee.",
  enthusiastic: "Energetic, excited, optimistic. Show genuine passion.",
  direct: "Direct, concise, no fluff. Get straight to the point.",
  premium: "Premium-tier consultant tone. Authoritative, calm, scarcity-aware.",
  friendly: "Friendly, approachable, warm — but still capable.",
};

const lengthInstructions: Record<string, string> = {
  short: "Keep it under 150 words. Tight, scannable.",
  medium: "200-300 words. The default for most freelance proposals.",
  long: "350-500 words. Use when the project is complex or high-value.",
};

const transformInstructions: Record<string, string> = {
  more_persuasive: "Rewrite to be significantly more persuasive. Add a stronger hook, sharper value proposition, and a more compelling close. Use concrete proof points.",
  shorter: "Make this proposal noticeably shorter without losing the key value. Aim for ~60% of the current length. Remove anything filler.",
  longer: "Expand this proposal with more substance: deeper context, a richer approach section, and one extra proof point. Do not pad with fluff.",
  more_professional: "Rewrite with a more formal, professional, polished tone. Suitable for enterprise clients.",
  more_friendly: "Rewrite with a warmer, more personable, friendly tone. Still capable — never sycophantic.",
  premium_tone: "Rewrite as if from a premium-tier consultant: calm authority, scarcity, results-focused. Use language a $300/hr expert would use.",
  higher_conversion: "Optimize for reply rate: stronger hook, clear CTA, social proof, and a frictionless next step. Remove anything that creates hesitation.",
  simpler: "Simplify the language. Shorter sentences, plainer words. A non-technical client should fully understand it.",
  more_confident: "Rewrite with more confidence. Remove hedging language ('I think', 'maybe', 'I could'). Make claims with conviction.",
};

router.post("/proposals/analyze-job", async (req, res) => {
  try {
    const body = z
      .object({
        jobTitle: z.string().optional(),
        jobDescription: z.string().min(10),
        mySkills: z.string().optional(),
      })
      .parse(req.body);

    const system = `You are a freelance career analyst. You analyze job postings to surface client signals, risks, and fit. Return ONLY valid JSON, no markdown. Be honest — if something looks like a scam or a bad-fit client, say so.`;

    const user = `Analyze this freelance job posting.

${body.jobTitle ? `Job Title: ${body.jobTitle}` : ""}
Job Description:
${body.jobDescription}

${body.mySkills ? `My Skills: ${body.mySkills}` : ""}

Return JSON with this EXACT shape:
{
  "clientName": "<extracted client/company name, or null>",
  "scamRisk": "none" | "low" | "medium" | "high",
  "scamReasons": ["<reason>", "..."],
  "budget": {
    "level": "low" | "medium" | "high" | "unknown",
    "estimate": "<dollar range like '$500-2000' or null>"
  },
  "urgency": "low" | "medium" | "high",
  "keywords": ["<top 5-8 keywords/skills the client mentions>"],
  "fitScore": <0-100 integer, how well my skills match>,
  "fitReason": "<one-sentence explanation of fit>"
}

Scam signals: vague scope + huge budget, asks to move off-platform immediately, asks for free work, gift cards / crypto, broken English with urgent claim, "easy money" framing.
If mySkills is empty, set fitScore to 50 and fitReason to "no skills provided to compare".`;

    const parsed = await chatJsonValidated(system, user, analysisSchema, 900);
    res.json(normalizeAnalysis(parsed));
  } catch (e) {
    if (handleZod(e, res)) return;
    const msg = e instanceof Error ? e.message : "Internal error";
    console.error("[proposals/analyze-job] error:", msg);
    res.status(500).json({ error: `Analyze failed: ${msg}` });
  }
});

router.post("/proposals/generate-draft", async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const body = z
      .object({
        jobTitle: z.string().min(1),
        jobDescription: z.string().min(10),
        mySkills: z.string().min(1),
        budget: z.string().optional(),
        tone: z.enum(["professional", "casual", "enthusiastic", "direct", "premium", "friendly"]).default("professional"),
        length: z.enum(["short", "medium", "long"]).default("medium"),
        templateId: z.number().int().optional(),
      })
      .parse(req.body);

    let templateContent: string | null = null;
    if (body.templateId) {
      const [tpl] = await db
        .select()
        .from(proposalTemplates)
        .where(and(eq(proposalTemplates.id, body.templateId), eq(proposalTemplates.userId, uid)))
        .limit(1);
      if (tpl) {
        templateContent = tpl.content;
        await db
          .update(proposalTemplates)
          .set({ useCount: tpl.useCount + 1 })
          .where(eq(proposalTemplates.id, tpl.id));
      }
    }

    const system = `You are FreelanceFlow AI — a proposal expert that writes high-converting freelance pitches. Output JSON only, no markdown.`;

    const user = `Write a freelance proposal AND score it.

Job Title: ${body.jobTitle}
Job Description: ${body.jobDescription}
My Skills: ${body.mySkills}
${body.budget ? `My Rate / Budget: ${body.budget}` : ""}

Tone: ${toneInstructions[body.tone]}
Length: ${lengthInstructions[body.length]}

${templateContent ? `Use this template as a starting structure (adapt it, don't copy verbatim):\n${templateContent}\n` : ""}

Requirements:
1. Open with a hook that proves you understood the client's problem
2. Reference 1-2 specifics from the job description
3. Show relevant proof (skills/results)
4. Propose a clear next step / CTA
5. Sound like a real human, not a template

Also extract:
- clientName: the client/company name if mentioned, else null
- keywords: 5-8 keywords from the job description
- a brief analysis (scamRisk, budget level/estimate, urgency, fitScore, fitReason)

Return JSON with this EXACT shape:
{
  "content": "<the full proposal text>",
  "score": <0-100 integer, your honest estimate of this proposal's reply chance>,
  "analysis": {
    "clientName": "<name or null>",
    "scamRisk": "none|low|medium|high",
    "scamReasons": ["..."],
    "budget": { "level": "low|medium|high|unknown", "estimate": "..." | null },
    "urgency": "low|medium|high",
    "keywords": ["..."],
    "fitScore": <0-100>,
    "fitReason": "<one sentence>"
  }
}`;

    const draftSchema = z.object({
      content: z.string().min(1),
      score: z.number().optional(),
      analysis: analysisSchema.nullable().optional(),
    });
    const parsed = await chatJsonValidated(system, user, draftSchema, 1800);

    if (!parsed) {
      return res.status(502).json({ error: "AI returned an unparseable response. Please try again." });
    }

    res.json({
      content: parsed.content,
      score: Math.max(0, Math.min(100, Math.round(parsed.score ?? 70))),
      analysis: normalizeAnalysis(parsed.analysis ?? null),
    });
  } catch (e) {
    if (handleZod(e, res)) return;
    const msg = e instanceof Error ? e.message : "Internal error";
    console.error("[proposals/generate-draft] error:", msg);
    res.status(500).json({ error: `Generate failed: ${msg}` });
  }
});

router.post("/proposals/regenerate", async (req, res) => {
  try {
    const body = z
      .object({
        content: z.string().min(10),
        transform: z.enum([
          "more_persuasive",
          "shorter",
          "longer",
          "more_professional",
          "more_friendly",
          "premium_tone",
          "higher_conversion",
          "simpler",
          "more_confident",
        ]),
        jobDescription: z.string().optional(),
        tone: z.string().optional(),
      })
      .parse(req.body);

    const system = `You rewrite freelance proposals to meet a specific transformation goal. Preserve the freelancer's voice and any concrete claims. Output the rewritten proposal text only — no preamble, no markdown fences.`;

    const user = `${body.jobDescription ? `Original job posting (for context):\n${body.jobDescription}\n\n` : ""}Current proposal:
${body.content}

Transformation: ${transformInstructions[body.transform]}

Return the rewritten proposal text only.`;

    const newContent = await chatText(system, user, 1500);
    if (!newContent || newContent.trim().length === 0) {
      return res.status(502).json({ error: "AI returned an empty response. Please try again." });
    }
    res.json({ content: newContent, score: null });
  } catch (e) {
    if (handleZod(e, res)) return;
    const msg = e instanceof Error ? e.message : "Internal error";
    console.error("[proposals/regenerate] error:", msg);
    res.status(500).json({ error: `Regenerate failed: ${msg}` });
  }
});

// ---------- Templates CRUD ----------

router.get("/proposal-templates", async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const rows = await db
      .select()
      .from(proposalTemplates)
      .where(eq(proposalTemplates.userId, uid))
      .orderBy(desc(proposalTemplates.isFavorite), desc(proposalTemplates.useCount), desc(proposalTemplates.createdAt));
    res.json(
      rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))
    );
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

const templateBody = z.object({
  name: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  niche: z.string().max(100).optional(),
  tone: z.string().max(50).optional(),
  isFavorite: z.number().int().min(0).max(1).optional(),
});

router.post("/proposal-templates", async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const body = templateBody.parse(req.body);
    const [row] = await db
      .insert(proposalTemplates)
      .values({ userId: uid, ...body })
      .returning();
    res.status(201).json({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

router.patch("/proposal-templates/:id", async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const body = templateBody.partial().parse(req.body);
    const [row] = await db
      .update(proposalTemplates)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(proposalTemplates.id, id), eq(proposalTemplates.userId, uid)))
      .returning();
    if (!row) return res.status(404).json({ error: "Template not found" });
    res.json({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

router.delete("/proposal-templates/:id", async (req, res) => {
  try {
    const uid = (req as unknown as AuthedRequest).userId;
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const [row] = await db
      .delete(proposalTemplates)
      .where(and(eq(proposalTemplates.id, id), eq(proposalTemplates.userId, uid)))
      .returning();
    if (!row) return res.status(404).json({ error: "Template not found" });
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

export default router;
