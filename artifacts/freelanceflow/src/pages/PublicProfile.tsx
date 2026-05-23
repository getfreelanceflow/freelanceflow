import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { api, type PublicProfile as PublicProfileT } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Globe,
  Linkedin,
  Github,
  Twitter,
  ArrowRight,
  Sparkles,
  Briefcase,
} from "lucide-react";

function fmtPrice(n: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n}`;
  }
}

export default function PublicProfile() {
  const [, params] = useRoute("/u/:slug");
  const slug = params?.slug ?? "";
  const { data, isLoading, error } = useQuery<PublicProfileT>({
    queryKey: ["public-profile", slug],
    queryFn: () => api.getPublicProfile(slug),
    enabled: !!slug,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Profile not found</h1>
            <p className="text-muted-foreground">
              This freelancer profile doesn't exist or has been set to private.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { profile, packages } = data;
  const social = profile.socialLinks ?? {};

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 py-12 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <Card className="border-2 overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 sm:p-12">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              {profile.displayName || "Freelancer"}
            </h1>
            {profile.headline && (
              <p className="text-xl text-muted-foreground mt-2">{profile.headline}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
              {profile.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> {profile.location}
                </span>
              )}
              {social.website && (
                <a
                  href={social.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-primary"
                >
                  <Globe className="h-4 w-4" /> Website
                </a>
              )}
              {social.linkedin && (
                <a
                  href={social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-primary"
                >
                  <Linkedin className="h-4 w-4" /> LinkedIn
                </a>
              )}
              {social.github && (
                <a
                  href={social.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-primary"
                >
                  <Github className="h-4 w-4" /> GitHub
                </a>
              )}
              {social.twitter && (
                <a
                  href={social.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-primary"
                >
                  <Twitter className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
          {profile.bio && (
            <CardContent className="p-8 sm:p-12 pt-6">
              <p className="text-base whitespace-pre-wrap leading-relaxed">{profile.bio}</p>
              {profile.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t">
                  {profile.skills.map((s, i) => (
                    <Badge key={i} variant="secondary">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Packages */}
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Service Packages
          </h2>
          {packages.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No public packages yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => {
                const hasTiers = pkg.tiers && pkg.tiers.length > 0;
                return (
                  <Link key={pkg.slug} href={`/p/${pkg.slug}`}>
                    <Card className="cursor-pointer transition-all hover:border-primary/60 hover:shadow-lg h-full">
                      <CardContent className="p-5 space-y-3 h-full flex flex-col">
                        {pkg.category && (
                          <Badge variant="outline" className="w-fit">
                            {pkg.category}
                          </Badge>
                        )}
                        <h3 className="font-semibold text-lg line-clamp-2">{pkg.title}</h3>
                        {pkg.tagline && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {pkg.tagline}
                          </p>
                        )}
                        <div className="flex-1" />
                        <div className="pt-3 border-t">
                          <div className="flex items-baseline justify-between">
                            <div>
                              <div className="text-xs text-muted-foreground">
                                {hasTiers ? "Starting at" : "Fixed price"}
                              </div>
                              <div className="text-2xl font-bold">
                                {fmtPrice(pkg.price, pkg.currency)}
                              </div>
                            </div>
                            <ArrowRight className="h-5 w-5 text-primary" />
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {pkg.deliveryDays}-day delivery
                            {hasTiers ? ` · ${pkg.tiers.length} tiers` : ""}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground pt-4">
          Powered by FreelanceFlow AI
        </p>
      </div>
    </div>
  );
}
