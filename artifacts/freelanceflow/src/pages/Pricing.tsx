import { SignUpButton, useAuth } from "@clerk/react";
import { Link } from "wouter";
import { Check, Zap, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateSubscriptionCheckout,
  useCreateCreditsCheckout,
} from "@workspace/api-client-react";
import { AI_COSTS } from "@/lib/aiCosts";

type SubTier = "pro" | "proplus" | "pro_annual" | "proplus_annual";

type Tier = {
  name: string;
  id: string;
  monthlyEquivalent: string;
  priceLabel: string;
  priceSuffix: string;
  description: string;
  features: string[];
  mostPopular: boolean;
  ctaTier: SubTier;
  saveLabel?: string;
};

const monthlyTiers: Tier[] = [
  {
    name: "Pro",
    id: "tier-pro",
    monthlyEquivalent: "$10",
    priceLabel: "$10",
    priceSuffix: "/mo",
    description: "For active freelancers shipping proposals weekly.",
    features: [
      "500 AI credits / month (auto-renew)",
      "All AI tools unlocked",
      "Unlimited saved jobs & templates",
      "Success scoring + tone matching",
      "Priority email support",
    ],
    mostPopular: true,
    ctaTier: "pro",
  },
  {
    name: "Pro Plus",
    id: "tier-plus",
    monthlyEquivalent: "$25",
    priceLabel: "$25",
    priceSuffix: "/mo",
    description: "Power-user volume for agencies and full-timers.",
    features: [
      "2,000 AI credits / month",
      "Everything in Pro",
      "Premium AI model for proposals",
      "Client history & insights",
      "24/7 priority support",
    ],
    mostPopular: false,
    ctaTier: "proplus",
  },
];

const annualTiers: Tier[] = [
  {
    name: "Pro Annual",
    id: "tier-pro-annual",
    monthlyEquivalent: "$8/mo",
    priceLabel: "$96",
    priceSuffix: "/yr",
    description: "Same Pro plan, billed yearly — 2 months free + bonus credits.",
    features: [
      "6,000 AI credits / year",
      "1,200 bonus credits / year",
      "All AI tools unlocked",
      "Save $24 vs paying monthly",
      "Priority email support",
    ],
    mostPopular: true,
    ctaTier: "pro_annual",
    saveLabel: "Save 20% + 1,200 bonus credits",
  },
  {
    name: "Pro Plus Annual",
    id: "tier-plus-annual",
    monthlyEquivalent: "$20/mo",
    priceLabel: "$240",
    priceSuffix: "/yr",
    description: "Maximum volume, billed yearly.",
    features: [
      "24,000 AI credits / year",
      "4,800 bonus credits / year",
      "Everything in Pro",
      "Premium AI model",
      "24/7 priority support",
    ],
    mostPopular: false,
    ctaTier: "proplus_annual",
    saveLabel: "Save $60 + 4,800 bonus credits",
  },
];

const packs = [
  { id: "small" as const, credits: 50, price: "$5", per: "$0.10/credit" },
  { id: "medium" as const, credits: 200, price: "$15", per: "$0.075/credit", badge: "Best value" },
  { id: "large" as const, credits: 500, price: "$30", per: "$0.06/credit" },
];

const costExamples: Array<{ label: string; cost: number }> = [
  { label: "Cover letter", cost: AI_COSTS.cover_letter },
  { label: "Proposal draft", cost: AI_COSTS.proposal_generate_draft },
  { label: "LinkedIn post", cost: AI_COSTS.linkedin_post },
  { label: "Resume match", cost: AI_COSTS.resume_match },
  { label: "Contract draft", cost: AI_COSTS.contract },
  { label: "Negotiation script", cost: AI_COSTS.negotiate },
];

export default function Pricing() {
  const { isSignedIn } = useAuth();
  const { toast } = useToast();
  const subCheckout = useCreateSubscriptionCheckout();
  const packCheckout = useCreateCreditsCheckout();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [cycle, setCycle] = useState<"month" | "year">("month");

  function notConfigured() {
    toast({
      title: "Payments aren't connected yet",
      description: "The site owner hasn't connected Stripe. Try again later or contact support.",
      variant: "destructive",
    });
  }

  async function startSubscription(tier: SubTier) {
    setLoadingId(tier);
    try {
      const res = await subCheckout.mutateAsync({ data: { tier } });
      if (res.url) window.location.href = res.url;
      else notConfigured();
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } }).response?.status;
      if (status === 503) notConfigured();
      else toast({ title: "Checkout failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoadingId(null);
    }
  }

  async function startPack(pack: "small" | "medium" | "large") {
    setLoadingId(pack);
    try {
      const res = await packCheckout.mutateAsync({ data: { pack } });
      if (res.url) window.location.href = res.url;
      else notConfigured();
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } }).response?.status;
      if (status === 503) notConfigured();
      else toast({ title: "Checkout failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoadingId(null);
    }
  }

  const tiers = cycle === "year" ? annualTiers : monthlyTiers;

  return (
    <div className="bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <Link href="/">
            <Button variant="ghost" className="mb-8">Back to Home</Button>
          </Link>
          <h2 className="text-base font-semibold leading-7 text-primary">Pricing</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            Subscribe or top up — your choice
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Subscribe for monthly credits + premium features, or grab a one-time credit pack that never expires.
          </p>

          <div className="mt-8 inline-flex rounded-full border border-border bg-muted/30 p-1" data-testid="billing-cycle-toggle">
            <button
              type="button"
              onClick={() => setCycle("month")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                cycle === "month" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="cycle-month"
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setCycle("year")}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                cycle === "year" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="cycle-year"
            >
              Annual
              <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400">
                Save 2 months
              </Badge>
            </button>
          </div>
        </div>

        <div className="isolate mx-auto mt-12 grid max-w-md grid-cols-1 gap-y-8 sm:mt-16 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8">
          <Card className="flex flex-col justify-between bg-card/50" data-testid="card-tier-free">
            <CardHeader>
              <CardTitle className="text-lg leading-8">Free</CardTitle>
              <CardDescription className="mt-4 text-sm leading-6">
                Try FreelanceFlow with 5 AI credits refreshed every 24 hours.
              </CardDescription>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-4xl font-bold tracking-tight">$0</span>
              </p>
            </CardHeader>
            <CardContent className="flex-1">
              <ul role="list" className="mt-2 space-y-3 text-sm leading-6">
                {[
                  "5 AI credits refreshed every 24 hours",
                  "Job feed + saved jobs",
                  "Basic dashboard",
                  "Community support",
                ].map((f) => (
                  <li key={f} className="flex gap-x-3">
                    <Check className="h-5 w-5 flex-none text-primary" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {isSignedIn ? (
                <Link href="/dashboard" className="w-full">
                  <Button variant="secondary" className="w-full">Go to dashboard</Button>
                </Link>
              ) : (
                <SignUpButton mode="modal">
                  <Button variant="secondary" className="w-full">Get started free</Button>
                </SignUpButton>
              )}
            </CardFooter>
          </Card>

          {tiers.map((tier) => (
            <Card
              key={tier.id}
              className={`flex flex-col justify-between ${tier.mostPopular ? "ring-2 ring-primary bg-card/80" : "bg-card/50"}`}
              data-testid={`card-tier-${tier.id}`}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-x-4">
                  <CardTitle id={tier.id} className="text-lg leading-8">{tier.name}</CardTitle>
                  {tier.mostPopular && (
                    <Badge className="rounded-full bg-primary/20 text-primary hover:bg-primary/30">Most popular</Badge>
                  )}
                </div>
                <CardDescription className="mt-4 text-sm leading-6">{tier.description}</CardDescription>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight">{tier.priceLabel}</span>
                  <span className="text-sm font-semibold leading-6 text-muted-foreground">{tier.priceSuffix}</span>
                </p>
                {cycle === "year" && (
                  <p className="mt-1 text-xs text-muted-foreground">≈ {tier.monthlyEquivalent}</p>
                )}
                {tier.saveLabel && (
                  <Badge className="mt-2 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400">
                    <Sparkles className="mr-1 h-3 w-3" />
                    {tier.saveLabel}
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="flex-1">
                <ul role="list" className="mt-2 space-y-3 text-sm leading-6">
                  {tier.features.map((f) => (
                    <li key={f} className="flex gap-x-3">
                      <Check className="h-5 w-5 flex-none text-primary" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                {isSignedIn ? (
                  <Button
                    className="w-full"
                    variant={tier.mostPopular ? "default" : "secondary"}
                    onClick={() => startSubscription(tier.ctaTier)}
                    disabled={loadingId === tier.ctaTier}
                    data-testid={`button-subscribe-${tier.ctaTier}`}
                  >
                    {loadingId === tier.ctaTier ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Subscribe to {tier.name}
                  </Button>
                ) : (
                  <SignUpButton mode="modal">
                    <Button className="w-full" variant={tier.mostPopular ? "default" : "secondary"}>
                      Start with {tier.name}
                    </Button>
                  </SignUpButton>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mx-auto mt-16 max-w-3xl">
          <Card className="bg-card/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-amber-500" />
                What credits buy you
              </CardTitle>
              <CardDescription>Every AI action costs a small number of credits — no hidden usage.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {costExamples.map((ex) => (
                  <div
                    key={ex.label}
                    className="flex items-center justify-between rounded-md border border-border/60 bg-background/50 px-3 py-2 text-sm"
                  >
                    <span>{ex.label}</span>
                    <Badge variant="secondary" className="gap-1 font-normal">
                      <Zap className="h-3 w-3 text-amber-500" />
                      {ex.cost}
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Failed AI calls are auto-refunded. Credit packs never expire.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
              <Zap className="h-4 w-4" /> One-time credit packs
            </div>
            <h3 className="mt-4 text-3xl font-bold tracking-tight">Or just grab credits — never expire</h3>
            <p className="mt-3 text-muted-foreground">
              Need a bump without a subscription? Buy credits once and use them whenever.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
            {packs.map((p) => (
              <Card key={p.id} className="relative bg-card/50" data-testid={`card-pack-${p.id}`}>
                {p.badge && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    {p.badge}
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{p.credits} credits</CardTitle>
                  <CardDescription>{p.per}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{p.price}</p>
                </CardContent>
                <CardFooter>
                  {isSignedIn ? (
                    <Button
                      className="w-full"
                      onClick={() => startPack(p.id)}
                      disabled={loadingId === p.id}
                      data-testid={`button-buy-${p.id}`}
                    >
                      {loadingId === p.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Buy {p.credits} credits
                    </Button>
                  ) : (
                    <SignUpButton mode="modal">
                      <Button className="w-full">Sign up to buy</Button>
                    </SignUpButton>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
