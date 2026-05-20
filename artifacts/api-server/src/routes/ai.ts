import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { z } from "zod";
import { db } from "@workspace/db";
import { jobs } from "@workspace/db/schema";

const router = Router();

async function chat(system: string, user: string, maxTokens = 800): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-5.4",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_completion_tokens: maxTokens,
  });
  return completion.choices[0]?.message?.content ?? "";
}

router.post("/ai/bio", async (req, res) => {
  try {
    const body = z
      .object({
        name: z.string().optional(),
        role: z.string(),
        skills: z.string(),
        experience: z.string().optional(),
        tone: z.string().optional(),
        platform: z.enum(["upwork", "fiverr", "linkedin", "general"]).default("general"),
      })
      .parse(req.body);

    const system = `You write high-converting freelancer profile bios optimized for ${body.platform}. Bios should be punchy, results-focused, and showcase clear value to clients. No fluff.`;
    const user = `Write a freelancer bio for ${body.name ?? "this freelancer"}.
Role/Specialty: ${body.role}
Key skills: ${body.skills}
${body.experience ? `Experience: ${body.experience}` : ""}
Tone: ${body.tone ?? "Confident, professional, warm"}

Requirements:
- 100-150 words
- Open with a strong value proposition
- Mention 2-3 specific results or specialties
- End with an invitation to work together
- Optimized for ${body.platform} algorithm and reader scanning`;

    const content = await chat(system, user, 600);
    res.json({ bio: content });
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.post("/ai/cover-letter", async (req, res) => {
  try {
    const body = z
      .object({
        jobTitle: z.string(),
        jobDescription: z.string(),
        mySkills: z.string(),
        myName: z.string().optional(),
        tone: z.string().optional(),
      })
      .parse(req.body);

    const system = `You write personalized, persuasive cover letters for freelance job applications. Letters should feel human, specific, and tailored — never generic.`;
    const user = `Write a cover letter for this freelance opportunity.
Job: ${body.jobTitle}
Description: ${body.jobDescription}
My skills: ${body.mySkills}
${body.myName ? `My name: ${body.myName}` : ""}
Tone: ${body.tone ?? "Professional and warm"}

Requirements:
- Salutation, 3 short body paragraphs, sign-off
- Reference 2 specifics from the job description
- Quantify a relevant result if possible
- Keep under 250 words`;

    const content = await chat(system, user, 800);
    res.json({ coverLetter: content });
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.post("/ai/rate-calculator", async (req, res) => {
  try {
    const body = z
      .object({
        role: z.string(),
        yearsExperience: z.number(),
        skills: z.string(),
        location: z.string().optional(),
        targetIncome: z.number().optional(),
        billableHoursPerWeek: z.number().optional(),
      })
      .parse(req.body);

    const billable = body.billableHoursPerWeek ?? 25;
    const incomeBased = body.targetIncome ? body.targetIncome / (billable * 48) : null;

    const system = `You are a freelance pricing strategist. Return ONLY valid JSON, no markdown. Use realistic 2025 freelance market rates.`;
    const user = `Suggest hourly rates for this freelancer.
Role: ${body.role}
Years experience: ${body.yearsExperience}
Skills: ${body.skills}
${body.location ? `Location: ${body.location}` : ""}
${body.targetIncome ? `Target annual income: $${body.targetIncome}` : ""}
Billable hours/week: ${billable}

Return JSON with this exact shape:
{
  "low": <number, conservative hourly>,
  "recommended": <number, market-rate hourly>,
  "high": <number, premium-tier hourly>,
  "rationale": "<2-3 sentences explaining the range>",
  "tips": ["<tip>", "<tip>", "<tip>"]
}`;

    const content = await chat(system, user, 600);
    let parsed: {
      low: number;
      recommended: number;
      high: number;
      rationale: string;
      tips: string[];
    };
    try {
      const cleaned = content.replace(/^```json\s*|\s*```$/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        low: 40,
        recommended: 75,
        high: 120,
        rationale: content || "Unable to parse rate suggestion.",
        tips: [],
      };
    }
    res.json({ ...parsed, incomeBased: incomeBased ? Math.round(incomeBased) : null });
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.post("/ai/predict-success", async (req, res) => {
  try {
    const body = z
      .object({
        proposalContent: z.string(),
        jobDescription: z.string().optional(),
      })
      .parse(req.body);

    const system = `You are a proposal-quality reviewer. Return ONLY valid JSON, no markdown.`;
    const user = `Score this freelance proposal's likelihood of winning the job.
${body.jobDescription ? `Job posting:\n${body.jobDescription}\n` : ""}
Proposal:
${body.proposalContent}

Return JSON with this exact shape:
{
  "score": <0-100 integer>,
  "verdict": "<one-line summary>",
  "strengths": ["<strength>", "<strength>"],
  "improvements": ["<actionable improvement>", "<actionable improvement>", "<actionable improvement>"]
}`;

    const content = await chat(system, user, 700);
    let parsed: {
      score: number;
      verdict: string;
      strengths: string[];
      improvements: string[];
    };
    try {
      const cleaned = content.replace(/^```json\s*|\s*```$/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        score: 70,
        verdict: content || "Unable to score proposal.",
        strengths: [],
        improvements: [],
      };
    }
    res.json(parsed);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.post("/ai/resume-match", async (req, res) => {
  try {
    const body = z
      .object({
        resumeText: z.string().min(20),
        age: z.number().int().positive().optional(),
        yearsExperience: z.number().nonnegative().optional(),
        pastExperiences: z.string().optional(),
        desiredRole: z.string().optional(),
      })
      .parse(req.body);

    const allJobs = await db.select().from(jobs).limit(50);

    if (allJobs.length === 0) {
      return res.json({ profile: null, matches: [] });
    }

    const jobList = allJobs.map((j) => ({
      id: j.id,
      title: j.title,
      description: j.description.slice(0, 400),
      category: j.category,
      skills: j.skills,
      budget: `$${j.budgetMin}-$${j.budgetMax}`,
      platform: j.platform,
    }));

    const system = `You are an expert freelance career matcher. You read a candidate's resume and rank job postings by fit. Return ONLY valid JSON, no markdown.`;
    const user = `Candidate info:
Resume:
${body.resumeText}

${body.age ? `Age: ${body.age}` : ""}
${body.yearsExperience !== undefined ? `Years of experience: ${body.yearsExperience}` : ""}
${body.pastExperiences ? `Past experiences (summary): ${body.pastExperiences}` : ""}
${body.desiredRole ? `Desired role: ${body.desiredRole}` : ""}

Available jobs (JSON):
${JSON.stringify(jobList)}

Return JSON with this exact shape:
{
  "profile": {
    "summary": "<2 sentence candidate summary>",
    "topSkills": ["<skill>", "<skill>", "<skill>", "<skill>", "<skill>"],
    "seniority": "<junior|mid|senior|expert>",
    "strengths": ["<strength>", "<strength>", "<strength>"]
  },
  "matches": [
    {
      "jobId": <number from list>,
      "score": <0-100>,
      "reason": "<1 sentence why this fits>",
      "highlights": ["<matching skill/experience>", "<matching skill/experience>"]
    }
  ]
}

Return ONLY the top 10 best-fitting jobs sorted by score descending.`;

    const content = await chat(system, user, 2000);

    type MatchResult = {
      profile: {
        summary: string;
        topSkills: string[];
        seniority: string;
        strengths: string[];
      } | null;
      matches: Array<{
        jobId: number;
        score: number;
        reason: string;
        highlights: string[];
      }>;
    };

    let parsed: MatchResult;
    try {
      const cleaned = content.replace(/^```json\s*|\s*```$/g, "").trim();
      parsed = JSON.parse(cleaned) as MatchResult;
    } catch {
      return res.status(500).json({ error: "Failed to parse AI response", raw: content });
    }

    const jobMap = new Map(allJobs.map((j) => [j.id, j]));
    const enriched = parsed.matches
      .filter((m) => jobMap.has(m.jobId))
      .map((m) => ({
        ...m,
        job: jobMap.get(m.jobId),
      }));

    res.json({ profile: parsed.profile, matches: enriched });
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.post("/ai/contract", async (req, res) => {
  try {
    const body = z
      .object({
        clientName: z.string(),
        projectTitle: z.string(),
        scope: z.string(),
        fee: z.string(),
        timeline: z.string().optional(),
        paymentTerms: z.string().optional(),
        freelancerName: z.string().optional(),
      })
      .parse(req.body);

    const system = `You draft clear, professional freelance contracts in plain English. Use standard sections. Avoid legalese where possible. Always include a disclaimer that this is a template and should be reviewed by a lawyer.`;
    const user = `Draft a freelance contract with these details:
Freelancer: ${body.freelancerName ?? "[Freelancer Name]"}
Client: ${body.clientName}
Project: ${body.projectTitle}
Scope of work: ${body.scope}
Fee: ${body.fee}
Timeline: ${body.timeline ?? "To be agreed"}
Payment terms: ${body.paymentTerms ?? "50% upfront, 50% on completion"}

Include sections: Parties, Scope of Work, Deliverables, Timeline, Compensation, Payment Terms, Revisions, Intellectual Property, Confidentiality, Termination, Limitation of Liability, Signatures. End with a "This is a template..." disclaimer.`;

    const content = await chat(system, user, 2500);
    res.json({ contract: content });
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.post("/ai/negotiate", async (req, res) => {
  try {
    const body = z
      .object({
        situation: z.string(),
        myDesiredOutcome: z.string(),
        clientPosition: z.string().optional(),
        tone: z.string().optional(),
      })
      .parse(req.body);

    const system = `You are a freelance negotiation coach. Write a professional, confident negotiation reply that protects the freelancer's value without burning the relationship.`;
    const user = `Situation: ${body.situation}
${body.clientPosition ? `Client position: ${body.clientPosition}` : ""}
My desired outcome: ${body.myDesiredOutcome}
Tone: ${body.tone ?? "Confident, respectful, collaborative"}

Write a reply (200-300 words) the freelancer can send. Open with empathy, anchor the value delivered, propose a clear path forward, and offer 1-2 specific compromises if useful. End with a clear next step.`;

    const content = await chat(system, user, 900);
    res.json({ reply: content });
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.post("/ai/skill-gap", async (req, res) => {
  try {
    const body = z
      .object({
        currentSkills: z.string(),
        targetRole: z.string(),
        yearsExperience: z.number().optional(),
      })
      .parse(req.body);

    const system = `You are a freelance career advisor. Return ONLY valid JSON, no markdown.`;
    const user = `Analyze the gap between this freelancer's current skills and their target role.
Current skills: ${body.currentSkills}
Target role: ${body.targetRole}
${body.yearsExperience !== undefined ? `Years experience: ${body.yearsExperience}` : ""}

Return JSON with this exact shape:
{
  "readiness": <0-100 integer>,
  "verdict": "<one-line summary of readiness>",
  "missingSkills": [
    {"skill": "<skill name>", "priority": "high|medium|low", "why": "<short reason>"}
  ],
  "recommendedSteps": ["<actionable step>", "<actionable step>", "<actionable step>"],
  "rateProjection": "<estimate of hourly rate after closing gap>"
}

Limit missingSkills to top 5.`;

    const content = await chat(system, user, 1200);
    let parsed: unknown;
    try {
      const cleaned = content.replace(/^```json\s*|\s*```$/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: "Failed to parse AI response", raw: content });
    }
    res.json(parsed);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

export default router;
