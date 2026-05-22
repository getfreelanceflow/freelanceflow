import { db, jobs, type InsertJob } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";
import seedData from "./seed-jobs.json" with { type: "json" };

type SeedRow = {
  title: string;
  description: string;
  category: string;
  budgetMin: string;
  budgetMax: string;
  skills: string[];
  platform: string;
  successScore: string;
  clientName: string | null;
  clientRating: string | null;
  jobType: string;
  location: string | null;
};

// Arbitrary stable key for the jobs-seed advisory lock. Any other process that
// uses the same int will contend on the same lock, so keep this unique to this
// seeder.
const SEED_LOCK_KEY = 7271847501;

export async function seedJobsIfEmpty(): Promise<void> {
  try {
    // Fast path: skip the lock dance if the table already has data.
    const [pre] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(jobs);
    if (pre.count > 0) {
      logger.info({ jobsCount: pre.count }, "Jobs already seeded; skipping");
      return;
    }

    // Acquire a Postgres session-level advisory lock so concurrent boots
    // serialize through this critical section. If another instance holds it,
    // we skip — that instance will do the work.
    const lockRes = await db.execute<{ locked: boolean }>(
      sql`SELECT pg_try_advisory_lock(${SEED_LOCK_KEY}) AS locked`,
    );
    const locked = lockRes.rows[0]?.locked === true;
    if (!locked) {
      logger.info("Another instance is seeding jobs; skipping");
      return;
    }

    try {
      // Re-check inside the lock to avoid double-inserting.
      const [post] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(jobs);
      if (post.count > 0) {
        logger.info(
          { jobsCount: post.count },
          "Jobs were seeded by another instance; skipping",
        );
        return;
      }

      const rows = seedData as SeedRow[];
      if (rows.length === 0) {
        logger.warn("seed-jobs.json is empty; nothing to seed");
        return;
      }

      const payload: InsertJob[] = rows.map((r) => ({
        title: r.title,
        description: r.description,
        category: r.category,
        budgetMin: r.budgetMin,
        budgetMax: r.budgetMax,
        skills: r.skills,
        platform: r.platform,
        successScore: r.successScore,
        clientName: r.clientName,
        clientRating: r.clientRating,
        jobType: r.jobType,
        location: r.location,
      }));

      // Bulk insert in chunks to stay within parameter limits.
      const CHUNK = 100;
      let inserted = 0;
      for (let i = 0; i < payload.length; i += CHUNK) {
        const chunk = payload.slice(i, i + CHUNK);
        await db.insert(jobs).values(chunk);
        inserted += chunk.length;
      }
      logger.info({ inserted, seeded: true }, "Seeded jobs into empty jobs table");
    } finally {
      await db.execute(sql`SELECT pg_advisory_unlock(${SEED_LOCK_KEY})`);
    }
  } catch (err) {
    logger.error({ err }, "seedJobsIfEmpty failed");
  }
}
