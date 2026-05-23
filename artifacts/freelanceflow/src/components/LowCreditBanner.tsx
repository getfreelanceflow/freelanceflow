import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Zap, X } from "lucide-react";
import { useGetBillingMe, getGetBillingMeQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { copyFor, isLowCredits, isOutOfCredits, LOW_CREDIT_THRESHOLD } from "@/lib/paywallSignals";

const DISMISS_KEY = "ff:lowCreditDismissedAt";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

export default function LowCreditBanner() {
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const { data: billing } = useGetBillingMe({
    query: {
      queryKey: getGetBillingMeQueryKey(),
      refetchOnWindowFocus: true,
      staleTime: 30_000,
    },
  });

  useEffect(() => {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (raw) {
      const at = parseInt(raw, 10);
      if (Number.isFinite(at) && Date.now() - at < DISMISS_TTL_MS) {
        setDismissed(true);
      }
    }
  }, []);

  if (!billing) return null;
  // Don't nag paid users — they already converted.
  if (billing.plan !== "free") return null;
  if (!isLowCredits(billing)) return null;
  if (dismissed) return null;

  const out = isOutOfCredits(billing);
  const copy = copyFor(out ? "out_of_credits" : "low_credit");

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }

  return (
    <div
      className={`border-b px-3 py-2 sm:px-4 sm:py-2.5 ${
        out
          ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
          : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
      }`}
      data-testid="low-credit-banner"
      role="status"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2">
        <Zap className="h-4 w-4 flex-shrink-0" aria-hidden />
        <p className="flex-1 min-w-0 text-sm leading-snug">
          <span className="font-semibold">{copy.headline}</span>{" "}
          <span className="hidden md:inline">
            {out
              ? `You have 0 credits left. ${copy.body}`
              : `${billing.credits} of ${LOW_CREDIT_THRESHOLD} or fewer credits left. ${copy.body}`}
          </span>
          <span className="md:hidden text-xs opacity-80">
            {out ? "0 credits left." : `${billing.credits} credit${billing.credits === 1 ? "" : "s"} left.`}
          </span>
        </p>
        <div className="flex items-center gap-1.5 ml-auto">
          <Button
            size="sm"
            className="h-8 text-xs sm:text-sm px-2.5 sm:px-3"
            onClick={() => setLocation("/pricing")}
            data-testid="banner-upgrade"
          >
            {copy.primaryCta}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs sm:text-sm px-2.5 sm:px-3 hidden sm:inline-flex"
            onClick={() => setLocation("/billing")}
            data-testid="banner-buy-credits"
          >
            {copy.secondaryCta}
          </Button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md p-1.5 transition hover:bg-foreground/10 min-w-[32px] min-h-[32px] flex items-center justify-center"
            aria-label="Dismiss"
            data-testid="banner-dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
