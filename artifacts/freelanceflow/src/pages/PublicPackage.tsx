import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { api, type ServicePackage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Clock, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function PublicPackage() {
  const [, params] = useRoute("/p/:slug");
  const slug = params?.slug ?? "";
  const [pkg, setPkg] = useState<ServicePackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inquired, setInquired] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api
      .getPublicPackage(slug)
      .then((p) => setPkg(p))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  function safeCtaUrl(u: string | null): string | null {
    if (!u) return null;
    try {
      const parsed = new URL(u);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
      return parsed.toString();
    } catch {
      return null;
    }
  }

  function onCta() {
    if (!pkg) return;
    api.inquirePackage(pkg.slug).catch(() => {});
    setInquired(true);
    const dest = safeCtaUrl(pkg.ctaUrl);
    if (dest) {
      window.location.href = dest;
    } else {
      toast.success("Thanks — the provider has been notified of your interest.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold">Package not found</h2>
            <p className="text-muted-foreground mt-2">
              This link may have expired or been made private.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          {pkg.category && (
            <Badge variant="outline" className="mb-3">
              {pkg.category}
            </Badge>
          )}
          <h1 className="text-4xl font-bold tracking-tight">{pkg.title}</h1>
          {pkg.tagline && (
            <p className="text-xl text-muted-foreground mt-3">{pkg.tagline}</p>
          )}
        </div>

        <Card className="mb-6">
          <CardContent className="p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-4 mb-6 pb-6 border-b">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold tracking-tight">
                    {Number(pkg.price).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-lg text-muted-foreground">{pkg.currency}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Fixed price · No surprises</p>
              </div>
              <div className="flex gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium">{pkg.deliveryDays} days</div>
                    <div className="text-xs text-muted-foreground">Delivery</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium">
                      {pkg.revisions} revision{pkg.revisions === 1 ? "" : "s"}
                    </div>
                    <div className="text-xs text-muted-foreground">Included</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none mb-6">
              <h3 className="text-base font-semibold mb-2">About this package</h3>
              <p className="whitespace-pre-wrap text-muted-foreground">{pkg.description}</p>
            </div>

            {pkg.deliverables?.length > 0 && (
              <div className="mb-8">
                <h3 className="text-base font-semibold mb-3">What you get</h3>
                <ul className="space-y-2">
                  {pkg.deliverables.map((d, i) => (
                    <li key={i} className="flex gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button size="lg" className="w-full" onClick={onCta} disabled={inquired && !pkg.ctaUrl}>
              <Sparkles className="h-4 w-4 mr-2" />
              {inquired && !pkg.ctaUrl
                ? "Inquiry sent"
                : pkg.ctaUrl
                  ? "Book this package"
                  : "I'm interested"}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Powered by FreelanceFlow AI
        </p>
      </div>
    </div>
  );
}
