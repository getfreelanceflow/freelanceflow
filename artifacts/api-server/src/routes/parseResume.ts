import { Router } from "express";
import { z } from "zod";
import { requireUser } from "../lib/requireUser";

const router = Router();

const Body = z.object({
  fileBase64: z.string().min(10),
  fileName: z.string().min(1),
});

router.post("/parse-resume", requireUser, async (req, res) => {
  try {
    const { fileBase64, fileName } = Body.parse(req.body);
    const buf = Buffer.from(fileBase64, "base64");
    const name = fileName.toLowerCase();
    let text = "";

    if (name.endsWith(".pdf")) {
      const mod = await import("pdf-parse");
      const pdfParse = (mod as unknown as { default: (b: Buffer) => Promise<{ text: string }> }).default;
      const out = await pdfParse(buf);
      text = out.text;
    } else if (name.endsWith(".docx")) {
      const mammoth = (await import("mammoth")).default;
      const out = await mammoth.extractRawText({ buffer: buf });
      text = out.value;
    } else if (name.endsWith(".doc")) {
      return res.status(400).json({ error: "Old .doc format isn't supported. Save as .docx or .pdf and try again." });
    } else if (name.endsWith(".txt")) {
      text = buf.toString("utf-8");
    } else {
      return res.status(400).json({ error: "Unsupported file type. Upload .pdf, .docx, or .txt." });
    }

    text = text.trim();
    if (!text) {
      return res
        .status(422)
        .json({ error: "Couldn't extract any text. The file may be a scanned image — try a different format or paste the text manually." });
    }
    res.json({ text });
  } catch (e) {
    console.error("[parse-resume] error:", e);
    res.status(500).json({ error: e instanceof Error ? e.message : "Failed to parse file" });
  }
});

export default router;
