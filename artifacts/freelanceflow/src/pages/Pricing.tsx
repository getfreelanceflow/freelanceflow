import { SignUpButton, useAuth } from "@clerk/react";
import { Link } from "wouter";
import { Check, Zap, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateSubscriptionCheckout,
  useCreateCreditsCheckout,
} from "@workspace/api-client-react";

type Tier = {
  name: string;
  id: "tier-free" | "tier-pro" | "tier-plus";
  price: string;
  priceSuffix?: string;
  description: string;
  features: string[];
  mostPopular: boolean;
  ctaTier?: "pro" | "proplus";
};

const tiers: Tier[] = [
  {
    name: "Free",
    id: "tier-free",
    price: "$0",
    description: "Try FreelanceFlow with 5 AI credits each month.",
    features: [
      "5 AI proposal credits / month",
      "Job feed + saved jobs",
      "Basic dashboard",
      "Community support",
    ],
    mostPopular: false,
  },
  {
    name: "Pro",
    id: "tier-pro",
    price: "$10",
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
    price: "$25",
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

const packs = [
  { id: "small" as const, credits: 50, price: "$5", per: "$0.10/credit" },
  { id: "medium" as const, credits: 200, price: "$15", per: "$0.075/credit", badge: "Best value" },
  { id: "large" as const, credits: 500, price: "$30", per: "$0.06/credit" },
];

export default function Pricing() {
  const { isSignedIn } = useAuth();
  const { toast } = useToast();
  const subCheckout = useCreateSubscriptionCheckout();
  const packCheckout = useCreateCreditsCheckout();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  function notConfigured() {
    toast({
      title: "Payments aren't connected yet",
      description: "The site owner hasn't connected Stripe. Try again later or contact support.",
      variant: "destructive",
    });
  }

  async function startSubscription(tier: "pro" | "proplus") {
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
        </div>

        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8">
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
                  <span className="text-4xl font-bold tracking-tight">{tier.price}</span>
                  {tier.priceSuffix && <span className="text-sm font-semibold leading-6 text-muted-foreground">{tier.priceSuffix}</span>}
                </p>
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
                {!tier.ctaTier ? (
                  isSignedIn ? (
                    <Link href="/dashboard" className="w-full">
                      <Button variant="secondary" className="w-full">Go to dashboard</Button>
                    </Link>
                  ) : (
                    <SignUpButton mode="modal">
                      <Button variant="secondary" className="w-full">Get started free</Button>
                    </SignUpButton>
                  )
                ) : isSignedIn ? (
                  <Button
                    className="w-full"
                    variant={tier.mostPopular ? "default" : "secondary"}
                    onClick={() => startSubscription(tier.ctaTier!)}
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

        <div className="mt-24">
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
