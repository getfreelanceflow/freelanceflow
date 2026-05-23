import { pgTable, serial, text, timestamp, integer, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { servicePackages } from "./servicePackages";

export const packageInquiries = pgTable(
  "package_inquiries",
  {
    id: serial("id").primaryKey(),
    packageId: integer("package_id")
      .notNull()
      .references(() => servicePackages.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    name: text("name"),
    email: text("email"),
    message: text("message"),
    tier: text("tier"),
    // new | read | starred | archived | spam — see INQUIRY_STATUSES.
    // DB CHECK constraint is added below to prevent stale/invalid writes.
    status: text("status").notNull().default("new"),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("pkg_inq_user_idx").on(t.userId, t.createdAt),
    packageIdx: index("pkg_inq_package_idx").on(t.packageId),
    // Composite index optimized for inbox tab queries:
    //   WHERE user_id = ? AND status IN (...) ORDER BY created_at DESC
    userStatusCreatedIdx: index("pkg_inq_user_status_created_idx").on(
      t.userId,
      t.status,
      t.createdAt,
    ),
    statusCheck: check(
      "pkg_inq_status_check",
      sql`${t.status} IN ('new','read','starred','archived','spam')`,
    ),
  }),
);

export const insertPackageInquirySchema = createInsertSchema(packageInquiries).omit({
  id: true,
  createdAt: true,
});

export type PackageInquiry = typeof packageInquiries.$inferSelect;
export type InsertPackageInquiry = z.infer<typeof insertPackageInquirySchema>;

export const INQUIRY_STATUSES = ["new", "read", "starred", "archived", "spam"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];
