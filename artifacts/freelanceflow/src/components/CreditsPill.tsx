import { Link } from "wouter";
import { Sparkles } from "lucide-react";
import { useGetBillingMe, getGetBillingMeQueryKey } from "@workspace/api-client-react";

export default function CreditsPill() {
  const { data, isLoading } = useGetBillingMe({
    query: { queryKey: getGetBillingMeQueryKey(), refetchOnWindowFocus: true, staleTime: 30_000 },
  });

  if (isLoading || !data) return null;
  const low = data.credits <= 3;

  return (
    <Link
      href="/billing"
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent ${
        low ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300" : "border-border bg-card"
      }`}
      data-testid="link-credits-pill"
      title={`${data.credits} AI credits · ${data.planName}`}
    >
      <Sparkles className="h-3.5 w-3.5 text-primary" />
      <span data-testid="text-credit-count">{data.credits}</span>
      <span className="hidden text-muted-foreground sm:inline">credits</span>
    </Link>
  );
}
