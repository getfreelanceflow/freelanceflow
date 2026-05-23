import { pgTable, serial, text, timestamp, integer, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { servicePackages } from "./servicePackages";

export const packageReviews = pgTable(
  "package_reviews",
  {
    id: serial("id").primaryKey(),
    packageId: integer("package_id")
      .notNull()
      .references(() => servicePackages.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    authorName: text("author_name").notNull(),
    authorEmail: text("author_email"),
    authorRole: text("author_role"),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull(),
    // pending | published | rejected
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("pkg_rev_user_idx").on(t.userId, t.createdAt),
    packageIdx: index("pkg_rev_package_idx").on(t.packageId, t.status),
    ratingCheck: check("pkg_rev_rating_check", sql`${t.rating} BETWEEN 1 AND 5`),
    statusCheck: check(
      "pkg_rev_status_check",
      sql`${t.status} IN ('pending','published','rejected')`,
    ),
  }),
);

export type PackageReview = typeof packageReviews.$inferSelect;

export const REVIEW_STATUSES = ["pending", "published", "rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
