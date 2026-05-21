import { Router } from "express";
import { z } from "zod";
import { requireUser } from "../lib/requireUser";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const Body = z.object({
  fileBase64: z.string().min(10),
  fileName: z.string().min(1),
  mimeType: z.string().optional(),
});

const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".heic", ".heif"];

function extOf(name: string) {
  const lower = name.toLowerCase();
  const idx = lower.lastIndexOf(".");
  return idx >= 0 ? lower.slice(idx) : "";
}

async function extractFromImage(buf: Buffer, mimeType: string): Promise<string> {
  const dataUrl = `data:${mimeType};base64,${buf.toString("base64")}`;
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract ALL text from this resume image, exactly as written. Preserve section headings, bullet points, dates, and contact info. Output plain text only — no commentary, no markdown.",
          },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    temperature: 0,
  });
  return completion.choices[0]?.message?.content?.trim() ?? "";
}

const MAX_BYTES = 10 * 1024 * 1024;

router.post("/parse-resume", requireUser, async (req, res) => {
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body." });
  }
  const { fileBase64, fileName, mimeType } = parsed.data;
  let buf: Buffer;
  try {
    buf = Buffer.from(fileBase64, "base64");
  } catch {
    return res.status(400).json({ error: "Invalid base64 payload." });
  }
  if (buf.length === 0) return res.status(400).json({ error: "Empty file." });
  if (buf.length > MAX_BYTES) {
    return res.status(413).json({ error: "File too large (max 10 MB)." });
  }
  const ext = extOf(fileName);
  try {
    let text = "";

    if (ext === ".pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buf) });
      try {
        const out = await parser.getText();
        text = out.text ?? "";
      } finally {
        await parser.destroy().catch(() => {});
      }
      // If the PDF was image-based (scanned), fall back to vision OCR on the first page
      if (!text.trim()) {
        const parser2 = new PDFParse({ data: new Uint8Array(buf) });
        try {
          const screenshots = await parser2.getScreenshot({ first: 3 });
          const pages = screenshots.pages ?? [];
          const parts: string[] = [];
          for (const p of pages) {
            if (p.dataUrl) {
              const m = /^data:([^;]+);base64,(.+)$/.exec(p.dataUrl);
              if (m) {
                const t = await extractFromImage(Buffer.from(m[2], "base64"), m[1]);
                if (t) parts.push(t);
              }
            }
          }
          text = parts.join("\n\n");
        } catch (ocrErr) {
          console.error("[parse-resume] OCR fallback failed: %s", ocrErr instanceof Error ? ocrErr.name : typeof ocrErr);
        } finally {
          await parser2.destroy().catch(() => {});
        }
      }
    } else if (ext === ".docx") {
      const mammoth = (await import("mammoth")).default;
      const out = await mammoth.extractRawText({ buffer: buf });
      text = out.value;
    } else if (ext === ".doc") {
      return res.status(415).json({
        error: "Old .doc format isn't supported. Save as .docx, .pdf, or take a photo.",
      });
    } else if (ext === ".txt") {
      text = buf.toString("utf-8");
    } else if (IMAGE_EXT.includes(ext)) {
      const safeMime = mimeType?.startsWith("image/") && !mimeType.includes("svg")
        ? mimeType
        : `image/${ext.slice(1).replace("jpg", "jpeg").replace("heif", "heic")}`;
      text = await extractFromImage(buf, safeMime);
    } else {
      return res.status(415).json({
        error: "Unsupported file type. Upload .pdf, .docx, .txt, or a photo (.png/.jpg/.webp).",
      });
    }

    text = text.trim();
    if (!text) {
      return res.status(422).json({
        error:
          "Couldn't extract any text. Try a clearer photo or a different format (.pdf, .docx, .txt), or paste manually.",
      });
    }
    res.json({ text });
  } catch (e) {
    console.error("[parse-resume] failed for ext=%s: %s", ext, e instanceof Error ? e.name : typeof e);
    res.status(500).json({ error: "Failed to parse file. Please try a different format or paste manually." });
  }
});

export default router;
