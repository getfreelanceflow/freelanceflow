import type { Request, Response, NextFunction } from "express";
import { consumeCredits, refundCredits } from "./billing";
import type { AuthedRequest } from "./requireUser";
import { logger } from "./logger";
import { AI_COSTS, type AiAction } from "./aiCosts";

/**
 * Express middleware: atomically consumes credits for an AI action before the
 * handler runs. If the downstream handler responds with a 4xx or 5xx status,
 * the credits are auto-refunded once.
 *
 * Must be mounted AFTER requireUser.
 */
export function requireCredits(action: AiAction) {
  const cost = AI_COSTS[action];
  return async (req: Request, res: Response, next: NextFunction) => {
    const uid = (req as unknown as AuthedRequest).userId;
    if (!uid) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const gate = await consumeCredits(uid, cost, action);
    if (!gate.ok) {
      res.status(402).json({
        error: "insufficient_credits",
        message: "You're out of AI credits. Upgrade your plan or buy a credit pack.",
        have: gate.have,
        needed: cost,
        action,
      });
      return;
    }

    let settled = false;
    res.on("finish", () => {
      if (settled) return;
      settled = true;
      if (res.statusCode >= 400) {
        refundCredits(uid, cost, gate.txId, `${action}_refund`).catch((err) => {
          logger.error(
            { err: err instanceof Error ? err.message : String(err), action, txId: gate.txId },
            "auto-refund failed",
          );
        });
      }
    });
    res.on("close", () => {
      if (settled) return;
      settled = true;
      // Connection closed before a response was sent — refund.
      refundCredits(uid, cost, gate.txId, `${action}_refund`).catch(() => {});
    });

    next();
  };
}
