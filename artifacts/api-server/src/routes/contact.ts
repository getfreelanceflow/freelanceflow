import { Router } from "express";
import { z } from "zod";
import { sendEmail, escapeHtml } from "../lib/email";

export const contactRouter = Router();

const SUPPORT_TO = process.env.CONTACT_TO ?? "support@freelanceflow.ai";

const contactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  subject: z.string().min(1).max(200).optional(),
  message: z.string().min(1).max(5000),
});

const buckets = new Map<string, { count: number; resetAt: number }>();
function rateLimited(ip: string, windowMs = 60_000, max = 5): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  b.count++;
  return b.count > max;
}

contactRouter.post("/contact", async (req, res) => {
  const ip = (req.ip || req.socket.remoteAddress || "unknown").toString();
  if (rateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests, please try again later." });
  }
  try {
    const body = contactSchema.parse(req.body);
    const subject = body.subject?.trim() || "New message via FreelanceFlow AI";
    const html = `
      <h2>New contact message</h2>
      <p><strong>From:</strong> ${escapeHtml(body.name)} &lt;${escapeHtml(body.email)}&gt;</p>
      <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
      <hr/>
      <p style="white-space:pre-wrap">${escapeHtml(body.message)}</p>
    `;
    const text = `From: ${body.name} <${body.email}>\nSubject: ${subject}\n\n${body.message}`;

    const result = await sendEmail({
      to: SUPPORT_TO,
      subject: `[Contact] ${subject}`,
      html,
      text,
      replyTo: body.email,
    });

    if (!result.ok && result.reason === "not_configured") {
      return res.json({
        ok: true,
        delivered: false,
        note: "Message received. Email delivery is not yet configured on this environment.",
      });
    }
    if (!result.ok) {
      return res.status(502).json({ error: "Failed to send message", detail: result.message });
    }
    res.json({ ok: true, delivered: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", issues: e.issues });
    }
    res.status(500).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

export default contactRouter;
