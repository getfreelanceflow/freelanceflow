import { Router } from "express";
import { db } from "@workspace/db";
import { profile, servicePackages } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

// Public profile page: lists the freelancer's bio + all their public packages.
// Accessible at /profiles/public/:slug — no auth required.
router.get("/profiles/public/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug).trim().toLowerCase();
    if (!slug) return res.status(404).json({ error: "Not found" });
    const [p] = await db
      .select()
      .from(profile)
      .where(eq(profile.publicSlug, slug))
      .limit(1);
    if (!p || p.publicEnabled === 0 || !p.userId) {
      return res.status(404).json({ error: "Not found" });
    }
    const pkgs = await db
      .select({
        slug: servicePackages.slug,
        title: servicePackages.title,
        tagline: servicePackages.tagline,
        price: servicePackages.price,
        currency: servicePackages.currency,
        deliveryDays: servicePackages.deliveryDays,
        category: servicePackages.category,
        tiers: servicePackages.tiers,
      })
      .from(servicePackages)
      .where(and(eq(servicePackages.userId, p.userId), eq(servicePackages.isPublic, true)))
      .orderBy(desc(servicePackages.createdAt));
    res.json({
      profile: {
        publicSlug: p.publicSlug,
        displayName: p.displayName,
        headline: p.headline,
        bio: p.bio,
        skills: p.skills,
        location: p.location,
        portfolioItems: p.portfolioItems,
        socialLinks: p.socialLinks,
      },
      packages: pkgs.map((k) => ({
        ...k,
        price: parseFloat(k.price),
      })),
    });
  } catch (e) {
    console.error("[publicProfile] GET /profiles/public/:slug:", e);
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
