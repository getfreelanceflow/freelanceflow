import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { z } from "zod";
import { db } from "@workspace/db";
import { jobs } from "@workspace/db/schema";
import { requireUser } from "../lib/requireUser";

const router = Router();
router.use(requireUser);

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
    console.error("[ai/resume-match] error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: `Resume match failed: ${msg}` });
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

router.post("/ai/outreach", async (req, res) => {
  try {
    const body = z
      .object({
        targetCompany: z.string().min(1),
        targetPerson: z.string().optional(),
        targetRole: z.string().optional(),
        myOffer: z.string().min(3),
        valueProp: z.string().optional(),
        tone: z.string().optional(),
      })
      .parse(req.body);

    const system = `You write cold outreach emails for freelancers that get replies. Short, specific, personalized, value-first. Never generic. Never desperate.`;
    const user = `Write a cold outreach email.
Target company: ${body.targetCompany}
${body.targetPerson ? `Target person: ${body.targetPerson}` : ""}
${body.targetRole ? `Their role: ${body.targetRole}` : ""}
My offer: ${body.myOffer}
${body.valueProp ? `My differentiator: ${body.valueProp}` : ""}
Tone: ${body.tone ?? "Direct, warm, confident"}

Output JSON:
{
  "subject": "compelling subject line under 60 chars",
  "email": "the email body (3-5 short paragraphs, max 150 words)",
  "followUp1": "a 2-sentence follow-up to send 4 days later",
  "followUp2": "a 1-sentence breakup email to send 10 days later"
}`;

    const content = await chat(system, user, 1200);
    const cleaned = content.replace(/^```json\s*|\s*```$/g, "").trim();
    res.json(JSON.parse(cleaned));
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.post("/ai/discovery-questions", async (req, res) => {
  try {
    const body = z
      .object({
        projectType: z.string().min(1),
        clientIndustry: z.string().optional(),
        budget: z.string().optional(),
      })
      .parse(req.body);

    const system = `You generate sales discovery questions that uncover client pain, budget, decision process, and timeline — without sounding like an interrogation. Each question should be open-ended and strategic.`;
    const user = `Generate discovery call questions for a freelancer about to take a sales call.
Project type: ${body.projectType}
${body.clientIndustry ? `Client industry: ${body.clientIndustry}` : ""}
${body.budget ? `Mentioned budget: ${body.budget}` : ""}

Output JSON:
{
  "sections": [
    {
      "category": "Goals & Outcomes",
      "questions": ["question 1", "question 2", "question 3"]
    },
    { "category": "Pain & Problems", "questions": [...] },
    { "category": "Budget & Authority", "questions": [...] },
    { "category": "Timeline & Process", "questions": [...] },
    { "category": "Risk & Red Flags", "questions": [...] }
  ],
  "closingTips": ["tip 1", "tip 2", "tip 3"]
}

3-5 questions per category, sharp and specific.`;

    const content = await chat(system, user, 1500);
    const cleaned = content.replace(/^```json\s*|\s*```$/g, "").trim();
    res.json(JSON.parse(cleaned));
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.post("/ai/scope-creep", async (req, res) => {
  try {
    const body = z
      .object({
        originalScope: z.string().min(3),
        clientMessage: z.string().min(3),
      })
      .parse(req.body);

    const system = `You are an expert at protecting freelancers from scope creep. You analyze client messages against the original project scope and identify additions, then draft a professional response.`;
    const user = `Original project scope: ${body.originalScope}

New client message: ${body.clientMessage}

Output JSON:
{
  "scopeCreepDetected": boolean,
  "severity": "none" | "minor" | "moderate" | "major",
  "additions": ["new item 1 not in original scope", ...],
  "estimatedExtraHours": number,
  "estimatedExtraCost": "string like '$500-1500'",
  "recommendation": "1-2 sentences on how to handle it",
  "responseTemplate": "a polite, firm email response the freelancer can send (3-5 sentences) that either re-scopes or quotes the extra work"
}`;

    const content = await chat(system, user, 1200);
    const cleaned = content.replace(/^```json\s*|\s*```$/g, "").trim();
    res.json(JSON.parse(cleaned));
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.post("/ai/late-payment", async (req, res) => {
  try {
    const body = z
      .object({
        clientName: z.string().min(1),
        invoiceNumber: z.string().optional(),
        amount: z.string().optional(),
        daysOverdue: z.number().int().nonnegative(),
        previousRelationship: z.string().optional(),
      })
      .parse(req.body);

    const system = `You write payment-chase emails for freelancers. The tone escalates appropriately with days overdue but always stays professional. Never threatening. Always specific.`;
    const user = `Generate payment reminder emails.
Client: ${body.clientName}
${body.invoiceNumber ? `Invoice: ${body.invoiceNumber}` : ""}
${body.amount ? `Amount: ${body.amount}` : ""}
Days overdue: ${body.daysOverdue}
${body.previousRelationship ? `History: ${body.previousRelationship}` : ""}

Output JSON:
{
  "currentEmail": { "subject": "...", "body": "appropriate for ${body.daysOverdue} days overdue" },
  "escalationLadder": [
    { "stage": "Friendly nudge (day 1-7)", "subject": "...", "body": "..." },
    { "stage": "Firm reminder (day 14)", "subject": "...", "body": "..." },
    { "stage": "Final notice (day 30)", "subject": "...", "body": "..." },
    { "stage": "Collections warning (day 45)", "subject": "...", "body": "..." }
  ],
  "tips": ["practical tip 1", "tip 2", "tip 3"]
}`;

    const content = await chat(system, user, 1800);
    const cleaned = content.replace(/^```json\s*|\s*```$/g, "").trim();
    res.json(JSON.parse(cleaned));
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.post("/ai/linkedin-post", async (req, res) => {
  try {
    const body = z
      .object({
        topic: z.string().min(3),
        angle: z.string().optional(),
        myRole: z.string().optional(),
        cta: z.string().optional(),
      })
      .parse(req.body);

    const system = `You write scroll-stopping LinkedIn posts for freelancers. Strong hooks, short lines, white space, story-driven. No corporate jargon. No hashtag spam (max 3).`;
    const user = `Write 3 LinkedIn post variations.
Topic: ${body.topic}
${body.angle ? `Angle: ${body.angle}` : ""}
${body.myRole ? `My role: ${body.myRole}` : ""}
${body.cta ? `Call to action: ${body.cta}` : ""}

Output JSON:
{
  "posts": [
    { "style": "Story", "hook": "...", "body": "full post (150-250 words, with line breaks as \\n\\n)", "hashtags": ["tag1", "tag2"] },
    { "style": "Contrarian Take", ... },
    { "style": "Tactical How-to", ... }
  ],
  "hookAlternatives": ["alt hook 1", "alt hook 2", "alt hook 3", "alt hook 4", "alt hook 5"]
}`;

    const content = await chat(system, user, 2000);
    const cleaned = content.replace(/^```json\s*|\s*```$/g, "").trim();
    res.json(JSON.parse(cleaned));
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.post("/ai/case-study", async (req, res) => {
  try {
    const body = z
      .object({
        projectName: z.string().min(1),
        client: z.string().optional(),
        challenge: z.string().min(3),
        solution: z.string().min(3),
        results: z.string().min(3),
        skills: z.string().optional(),
      })
      .parse(req.body);

    const system = `You turn freelance projects into portfolio case studies that win clients. Lead with the result, structure for skim-readers, quantify impact wherever possible.`;
    const user = `Write a portfolio case study.
Project: ${body.projectName}
${body.client ? `Client: ${body.client}` : ""}
Challenge: ${body.challenge}
Solution: ${body.solution}
Results: ${body.results}
${body.skills ? `Skills used: ${body.skills}` : ""}

Output JSON:
{
  "headline": "outcome-led headline (under 12 words)",
  "subheadline": "one-line context",
  "tldr": "2-sentence summary recruiters/clients will skim",
  "challenge": "rewritten challenge section (3-4 sentences)",
  "approach": "rewritten approach section (4-6 sentences)",
  "results": "results section with bullet stats",
  "resultsBullets": ["stat 1", "stat 2", "stat 3"],
  "testimonialPrompt": "a draft testimonial you could ask the client to approve and quote",
  "skillsHighlighted": ["skill 1", "skill 2", "skill 3", "skill 4"]
}`;

    const content = await chat(system, user, 1800);
    const cleaned = content.replace(/^```json\s*|\s*```$/g, "").trim();
    res.json(JSON.parse(cleaned));
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.post("/ai/niche-finder", async (req, res) => {
  try {
    const body = z
      .object({
        skills: z.string().min(3),
        pastWork: z.string().optional(),
        interests: z.string().optional(),
        income: z.string().optional(),
      })
      .parse(req.body);

    const system = `You are a freelance positioning strategist. You find profitable, defensible niches at the intersection of a freelancer's skills, interests, and market demand.`;
    const user = `Find niches for this freelancer.
Skills: ${body.skills}
${body.pastWork ? `Past work: ${body.pastWork}` : ""}
${body.interests ? `Interests: ${body.interests}` : ""}
${body.income ? `Income goal: ${body.income}` : ""}

Output JSON:
{
  "niches": [
    {
      "name": "niche name",
      "tagline": "1-line positioning statement",
      "whyItFits": "2 sentences",
      "marketDemand": "low" | "medium" | "high" | "very high",
      "competition": "low" | "medium" | "high",
      "avgProjectSize": "$X-Y range",
      "idealClients": ["client type 1", "client type 2", "client type 3"],
      "firstFiveActions": ["action 1", "action 2", "action 3", "action 4", "action 5"]
    }
  ],
  "positioning": "elevator pitch you can use immediately"
}

Return 4 niches, ordered by profitability potential.`;

    const content = await chat(system, user, 2000);
    const cleaned = content.replace(/^```json\s*|\s*```$/g, "").trim();
    res.json(JSON.parse(cleaned));
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.post("/ai/dream-job", async (req, res) => {
  try {
    const body = z
      .object({
        dreamJob: z.string().min(3),
        whatIWantToDo: z.string().min(3),
        currentSkills: z.string().optional(),
        experience: z.string().optional(),
        targetRate: z.string().optional(),
        location: z.string().optional(),
        remote: z.boolean().optional(),
      })
      .parse(req.body);

    const system = `You are an elite freelance career strategist. Given the user's dream role and what they want to do, you generate hyper-relevant, realistic freelance job opportunities matched to their goals. Return ONLY valid JSON.`;

    const user = `User's dream job: ${body.dreamJob}
What they want to do: ${body.whatIWantToDo}
${body.currentSkills ? `Current skills: ${body.currentSkills}` : ""}
${body.experience ? `Experience: ${body.experience}` : ""}
${body.targetRate ? `Target rate: ${body.targetRate}` : ""}
${body.location ? `Location: ${body.location}` : ""}
${body.remote ? `Prefers remote: yes` : ""}

Generate 6 realistic, varied freelance job opportunities matching their dream career path. For each job, output:
{
  "matches": [
    {
      "title": "specific, realistic job title",
      "company": "plausible company or 'Independent Client'",
      "description": "2-3 sentence project description",
      "skills": ["skill1", "skill2", "skill3", "skill4"],
      "budgetMin": number (USD),
      "budgetMax": number (USD),
      "duration": "e.g., '2 weeks', '3 months ongoing'",
      "platform": "Upwork|Toptal|LinkedIn|Direct|Contra",
      "matchScore": number 0-100,
      "whyItMatches": "1-2 sentences why this fits their dream",
      "howToWin": "specific actionable tactic to land this job"
    }
  ],
  "careerAdvice": "2-3 sentences of strategic advice for landing roles like this",
  "searchKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}

Mix budget levels — some entry/short ($500-3k), some mid ($3k-15k), and 1-2 high-ticket ($15k-50k+). Make them feel real, not generic.`;

    const content = await chat(system, user, 2000);
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
