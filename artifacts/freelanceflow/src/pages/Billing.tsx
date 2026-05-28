import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Loader2, Sparkles, ExternalLink, Zap, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  useGetBillingMe,
  getGetBillingMeQueryKey,
  useGetBillingCatalog,
  useCreateSubscriptionCheckout,
  useCreateCreditsCheckout,
  useCreateBillingPortal,
} from "@workspace/api-client-react";

type SubTier = "pro" | "proplus" | "pro_annual" | "proplus_annual";

export default function Billing() {
  const { toast } = useToast();
  const me = useGetBillingMe({ query: { queryKey: getGetBillingMeQueryKey(), refetchOnWindowFocus: true } });
  const catalog = useGetBillingCatalog();
  const sub = useCreateSubscriptionCheckout();
  const pack = useCreateCreditsCheckout();
  const portal = useCreateBillingPortal();
  const [loading, setLoading] = useState<string | null>(null);

  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (params.get("status") === "success" && sessionId) {
      toast({ title: "Payment successful", description: "Syncing your account…" });
      (async () => {
        try {
          const res = await fetch(`${window.location.origin}${base}/api/billing/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ sessionId }),
          });
          if (!res.ok) throw res;
          const result = (await res.json()) as { updated: boolean; plan?: string | null; grantedCredits?: number | null };
          toast({
            title: result.updated ? "Account upgraded" : "Still processing",
            description: result.updated
              ? `You are now on the ${result.plan ?? "Pro"} plan${result.grantedCredits ? ` with ${result.grantedCredits} credits` : ""}.`
              : "Payment confirmed but still finalizing. Your account will update shortly.",
          });
          await me.refetch();
        } catch {
          toast({ title: "Account syncing", description: "We'll update your account shortly.", variant: "destructive" });
        }
      })();
      return undefined;
    }
    if (params.get("status") === "success") {
      toast({ title: "Payment successful", description: "Your account is being updated…" });
      const t = setTimeout(() => me.refetch(), 2000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [me, toast, base]);

  const billing = me.data;
  const plans = catalog.data?.plans ?? [];
  const packs = catalog.data?.creditPacks ?? [];

  async function go(action: "sub" | "pack" | "portal", id?: string) {
    setLoading(`${action}:${id ?? ""}`);
    try {
      let url: string | null = null;
      if (action === "sub") {
        url = (await sub.mutateAsync({ data: { tier: id as SubTier, successUrl: `${window.location.origin}${base}/billing?status=success`, cancelUrl: `${window.location.origin}${base}/pricing?status=cancel` } })).url;
      } else if (action === "pack") {
        url = (await pack.mutateAsync({ data: { pack: id as "small" | "medium" | "large", successUrl: `${window.location.origin}${base}/billing?status=success`, cancelUrl: `${window.location.origin}${base}/pricing?status=cancel` } })).url;
      } else {
        const res = await fetch(`${window.location.origin}${base}/api/billing/portal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ returnUrl: `${window.location.origin}${base}/billing?status=portal` }),
        });
        if (!res.ok) throw res;
        const data = (await res.json()) as { url: string | null };
        url = data.url;
      }
      if (url) window.location.href = url;
      else throw new Error("no url");
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number }; status?: number }).response?.status ?? (e as { status?: number }).status;
      if (status === 503) {
        toast({
          title: "Payments aren't connected",
          description: "Stripe hasn't been hooked up yet. Please try again later.",
          variant: "destructive",
        });
      } else if (status === 400) {
        toast({ title: "No subscription yet", description: "Subscribe first to access the billing portal.", variant: "destructive" });
      } else {
        toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
      }
    } finally {
      setLoading(null);
    }
  }

  if (me.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & credits</h1>
          <p className="text-muted-foreground">Manage your subscription, top up credits, and view your plan.</p>
        </div>
        <Link href="/pricing">
          <Button variant="outline">See all plans</Button>
        </Link>
      </div>

      {billing && !billing.stripeConfigured && (
        <Alert>
          <AlertTitle>Payments aren't connected yet</AlertTitle>
          <AlertDescription>
            The site owner hasn't connected Stripe. You can still use your free credits — upgrades will become available soon.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-current-plan">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Current plan
              <Badge variant={billing?.plan === "free" ? "secondary" : "default"}>{billing?.planName ?? "Free"}</Badge>
            </CardTitle>
            <CardDescription>
              {billing?.plan === "free"
                ? "Free plan — earn 1 credit every 4.8 hours (up to 5)."
                : billing?.currentPeriodEnd
                  ? `Renews on ${new Date(billing.currentPeriodEnd).toLocaleDateString()}`
                  : "Active subscription"}
            </CardDescription>
          </CardHeader>
          <CardFooter className="gap-2">
            {billing?.hasStripeCustomer && billing?.stripeConfigured && (
              <Button variant="outline" onClick={() => go("portal")} disabled={loading?.startsWith("portal")}>
                {loading?.startsWith("portal") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                Manage in Stripe
              </Button>
            )}
          </CardFooter>
        </Card>

        <Card data-testid="card-credits">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI credits
            </CardTitle>
            <CardDescription>1 credit = 1 AI proposal generation or rewrite.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-5xl font-bold" data-testid="text-credit-balance">{billing?.credits ?? 0}</p>
            <p className="mt-1 text-sm text-muted-foreground">credits remaining</p>
          </CardContent>
        </Card>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Subscriptions</h2>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" />
            Annual = 2 months free + bonus credits
          </Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans
            .filter((p) => p.id !== "free")
            .sort((a, b) => {
              const order: Record<string, number> = { pro: 0, pro_annual: 1, proplus: 2, proplus_annual: 3 };
              return (order[a.id] ?? 99) - (order[b.id] ?? 99);
            })
            .map((p) => {
              const isCurrent = billing?.plan === p.id;
              const isAnnual = p.interval === "year";
              const cycleSuffix = isAnnual ? "/yr" : "/mo";
              const monthly = isAnnual ? Math.round((p.priceUsd / 12) * 100) / 100 : p.priceUsd;
              return (
                <Card key={p.id} className={isCurrent ? "ring-2 ring-primary" : ""} data-testid={`card-plan-${p.id}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {p.name}
                      {isAnnual && (
                        <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400">
                          Save
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {p.totalCreditsPerCycle.toLocaleString()} credits / {isAnnual ? "year" : "month"}
                      {p.bonusCreditsPerMonth > 0 && (
                        <span className="block text-emerald-600 dark:text-emerald-400">
                          +{(p.bonusCreditsPerMonth * 12).toLocaleString()} bonus credits / yr
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      ${p.priceUsd}
                      <span className="text-base font-normal text-muted-foreground">{cycleSuffix}</span>
                    </p>
                    {isAnnual && <p className="mt-1 text-xs text-muted-foreground">≈ ${monthly}/mo</p>}
                  </CardContent>
                  <CardFooter>
                    {isCurrent ? (
                      <Button variant="outline" className="w-full" disabled>Current plan</Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => go("sub", p.id)}
                        disabled={loading === `sub:${p.id}`}
                        data-testid={`button-upgrade-${p.id}`}
                      >
                        {loading === `sub:${p.id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                        {billing?.plan === "free" ? "Upgrade" : "Switch"}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-xl font-semibold">Top up with a credit pack</h2>
        <p className="mb-4 text-sm text-muted-foreground">One-time purchase. Credits never expire.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {packs.map((p) => (
            <Card key={p.id} data-testid={`card-pack-${p.id}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  {p.credits} credits
                </CardTitle>
                <CardDescription>{p.label}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">${p.priceUsd}</p>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => go("pack", p.id)}
                  disabled={loading === `pack:${p.id}`}
                  data-testid={`button-buy-pack-${p.id}`}
                >
                  {loading === `pack:${p.id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Buy {p.credits} credits
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
