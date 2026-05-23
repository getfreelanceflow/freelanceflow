import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { api, type PublicServicePackage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Clock, RefreshCw, Sparkles, Mail, Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import PackageReviews from "@/components/PackageReviews";

export default function PublicPackage() {
  const [, params] = useRoute("/p/:slug");
  const slug = params?.slug ?? "";
  const [pkg, setPkg] = useState<PublicServicePackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inquired, setInquired] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  // Track selection by index (stable identity) — names may not be unique
  // across edits and React keys must be too.
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api
      .getPublicPackage(slug)
      .then((p) => {
        setPkg(p);
        if (p.tiers && p.tiers.length > 0) {
          // Default to the middle tier (Standard) if 3 tiers, else first.
          setSelectedIdx(p.tiers.length === 3 ? 1 : 0);
        }
      })
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

  function onPrimary() {
    if (!pkg) return;
    const dest = safeCtaUrl(pkg.ctaUrl);
    if (dest) {
      api.inquirePackage(pkg.slug, selectedTierName ? { tier: selectedTierName } : undefined).catch(() => {});
      window.location.href = dest;
      return;
    }
    setContactOpen(true);
  }

  async function submitInquiry(e: React.FormEvent) {
    e.preventDefault();
    if (!pkg) return;
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in name, email, and message.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.inquirePackage(pkg.slug, {
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        ...(selectedTierName ? { tier: selectedTierName } : {}),
      });
      setInquired(true);
      setContactOpen(false);
      toast.success(
        res.delivered
          ? "Sent! The provider will reply to your email."
          : "Inquiry received — the provider has been notified.",
      );
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send inquiry");
    } finally {
      setSubmitting(false);
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

  const hasCta = !!safeCtaUrl(pkg.ctaUrl);
  const tiers = pkg.tiers ?? [];
  const hasTiers = tiers.length > 0;
  const activeTier = hasTiers ? tiers[Math.min(selectedIdx, tiers.length - 1)] : null;
  const selectedTierName = activeTier?.name ?? null;

  return (
    <div className="min-h-screen bg-background">
      <div className={cn("mx-auto px-6 py-12", hasTiers ? "max-w-5xl" : "max-w-3xl")}>
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

        <div className="prose prose-sm dark:prose-invert max-w-none mb-8">
          <h3 className="text-base font-semibold mb-2">About this package</h3>
          <p className="whitespace-pre-wrap text-muted-foreground">{pkg.description}</p>
        </div>

        {hasTiers ? (
          <>
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              {tiers.map((t, idx) => {
                const isMid = tiers.length === 3 && idx === 1;
                const isActive = idx === selectedIdx;
                return (
                  <Card
                    key={idx}
                    className={cn(
                      "flex flex-col cursor-pointer transition-all relative",
                      isActive
                        ? "ring-2 ring-primary shadow-lg scale-[1.02]"
                        : "hover:border-primary/40",
                      isMid && !isActive && "border-primary/30",
                    )}
                    onClick={() => setSelectedIdx(idx)}
                  >
                    {isMid && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary">Most popular</Badge>
                      </div>
                    )}
                    <CardContent className="p-6 flex-1 flex flex-col">
                      <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        {t.name}
                      </div>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-3xl font-bold">
                          {Number(t.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-sm text-muted-foreground">{pkg.currency}</span>
                      </div>
                      <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {t.deliveryDays}d
                        </span>
                        <span className="flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" /> {t.revisions} rev
                          {t.revisions === 1 ? "" : "s"}
                        </span>
                      </div>
                      {t.deliverables.length > 0 && (
                        <ul className="mt-4 space-y-2 flex-1">
                          {t.deliverables.map((d, i) => (
                            <li key={i} className="flex gap-2 text-sm">
                              <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                              <span>{d}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Button
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        className="mt-6 w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIdx(idx);
                        }}
                      >
                        {isActive ? "Selected" : "Select"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="mb-6">
              <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">You selected</p>
                  <p className="text-lg font-semibold">
                    {activeTier?.name} ·{" "}
                    {Number(activeTier?.price ?? 0).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}{" "}
                    {pkg.currency}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <Button size="lg" onClick={onPrimary} disabled={inquired && !hasCta}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {inquired && !hasCta
                      ? "Inquiry sent"
                      : hasCta
                        ? `Book ${activeTier?.name}`
                        : "I'm interested"}
                  </Button>
                  {!hasCta && (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setContactOpen(true)}
                      disabled={inquired}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Email provider
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
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

              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" className="flex-1" onClick={onPrimary} disabled={inquired && !hasCta}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {inquired && !hasCta
                    ? "Inquiry sent"
                    : hasCta
                      ? "Book this package"
                      : "I'm interested"}
                </Button>
                {!hasCta && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1 sm:flex-none"
                    onClick={() => setContactOpen(true)}
                    disabled={inquired}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email the provider
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {pkg.faqs && pkg.faqs.length > 0 && (
          <Card className="border-2">
            <CardContent className="p-6 sm:p-10">
              <h2 className="text-2xl font-bold mb-6">Frequently asked questions</h2>
              <div className="space-y-4">
                {pkg.faqs.map((q, i) => (
                  <details
                    key={i}
                    className="group rounded-lg border p-4 transition-colors open:bg-muted/40"
                  >
                    <summary className="cursor-pointer list-none flex items-start justify-between gap-4">
                      <span className="font-medium">{q.question}</span>
                      <span className="text-muted-foreground transition-transform group-open:rotate-45 select-none text-xl leading-none">
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">
                      {q.answer}
                    </p>
                  </details>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <PackageReviews slug={slug} />

        <p className="text-center text-xs text-muted-foreground">
          Powered by FreelanceFlow AI
        </p>
      </div>

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Get in touch about "{pkg.title}"</DialogTitle>
            <DialogDescription>
              {activeTier
                ? `Asking about the ${activeTier.name} tier. The provider will reply directly to your email.`
                : "Send a message to the provider. They'll reply directly to your email."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitInquiry} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inquiry-name">Your name</Label>
              <Input
                id="inquiry-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inquiry-email">Email</Label>
              <Input
                id="inquiry-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inquiry-message">Message</Label>
              <Textarea
                id="inquiry-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell the provider about your project, timeline, and any questions…"
                rows={5}
                required
                disabled={submitting}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setContactOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Sending…" : "Send inquiry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
