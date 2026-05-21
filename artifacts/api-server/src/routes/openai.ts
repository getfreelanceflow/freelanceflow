import { Router } from "express";
import { db, conversations, messages } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  GetOpenaiConversationParams,
  DeleteOpenaiConversationParams,
  CreateOpenaiConversationBody,
  ListOpenaiMessagesParams,
  SendOpenaiMessageParams,
  SendOpenaiMessageBody,
} from "@workspace/api-zod";

const router = Router();

const SYSTEM_PROMPT = `You are FreelanceFlow AI, an expert freelance career assistant. You help freelancers find jobs, write winning proposals, optimize their rates, and grow their freelance career. Be concise, actionable, and encouraging. Focus on practical advice that helps freelancers win more clients.`;

router.get("/openai/conversations", async (_req, res) => {
  try {
    const result = await db
      .select()
      .from(conversations)
      .orderBy(conversations.createdAt);
    res.json(
      result.map((c) => ({
        ...c,
        updatedAt: c.createdAt.toISOString(),
        createdAt: c.createdAt.toISOString(),
      }))
    );
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

router.post("/openai/conversations", async (req, res) => {
  try {
    const body = CreateOpenaiConversationBody.parse(req.body);
    const [convo] = await db
      .insert(conversations)
      .values({ title: body.title })
      .returning();

    if (body.systemPrompt) {
      await db.insert(messages).values({
        conversationId: convo.id,
        role: "system",
        content: body.systemPrompt,
      });
    }

    res.status(201).json({
      ...convo,
      updatedAt: convo.createdAt.toISOString(),
      createdAt: convo.createdAt.toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

router.get("/openai/conversations/:id", async (req, res) => {
  try {
    const { id } = GetOpenaiConversationParams.parse({
      id: parseInt(req.params.id),
    });
    const [convo] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    if (!convo) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);
    res.json({
      ...convo,
      updatedAt: convo.createdAt.toISOString(),
      createdAt: convo.createdAt.toISOString(),
      messages: msgs.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

router.delete("/openai/conversations/:id", async (req, res) => {
  try {
    const { id } = DeleteOpenaiConversationParams.parse({
      id: parseInt(req.params.id),
    });
    const [deleted] = await db
      .delete(conversations)
      .where(eq(conversations.id, id))
      .returning();
    if (!deleted) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

router.get("/openai/conversations/:id/messages", async (req, res) => {
  try {
    const { id } = ListOpenaiMessagesParams.parse({
      id: parseInt(req.params.id),
    });
    const [convo] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    if (!convo) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);
    res.json(
      msgs.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      }))
    );
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

router.post("/openai/conversations/:id/messages", async (req, res) => {
  try {
    const { id } = SendOpenaiMessageParams.parse({
      id: parseInt(req.params.id),
    });
    const body = SendOpenaiMessageBody.parse(req.body);

    const [convo] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    if (!convo) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    await db.insert(messages).values({
      conversationId: id,
      role: "user",
      content: body.content,
    });

    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);

    const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
      max_completion_tokens: 1024,
    });

    const assistantContent =
      completion.choices[0]?.message?.content ?? "I'm unable to respond right now.";

    const [assistantMsg] = await db
      .insert(messages)
      .values({
        conversationId: id,
        role: "assistant",
        content: assistantContent,
      })
      .returning();

    res.status(201).json({
      ...assistantMsg,
      createdAt: assistantMsg.createdAt.toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Internal error" });
  }
});

export default router;
