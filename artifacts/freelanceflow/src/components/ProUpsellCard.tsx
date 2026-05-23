import { useLocation } from "wouter";
import { Sparkles, CreditCard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { copyFor, type PaywallVariant } from "@/lib/paywallSignals";

interface Props {
  variant: PaywallVariant;
  /** Optional context line shown above the headline (e.g. "Budget: $2,500"). */
  context?: string;
  className?: string;
  /** When provided, renders a dismiss button. */
  onDismiss?: () => void;
  /** Override default href targets. */
  primaryHref?: string;
  secondaryHref?: string;
}

export default function ProUpsellCard({
  variant,
  context,
  className,
  onDismiss,
  primaryHref = "/pricing",
  secondaryHref = "/billing",
}: Props) {
  const [, setLocation] = useLocation();
  const copy = copyFor(variant);

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-card to-amber-500/5 p-5 shadow-md",
        className,
      )}
      data-testid={`upsell-${variant}`}
    >
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
          aria-label="Dismiss"
          data-testid={`upsell-dismiss-${variant}`}
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1 min-w-0 md:pr-6">
          {context && (
            <p className="text-[11px] sm:text-xs uppercase tracking-wider text-primary/80 break-words">
              {context}
            </p>
          )}
          <div className="mt-1 flex items-start gap-2">
            <Sparkles className="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-500" aria-hidden />
            <h3 className="text-sm sm:text-base font-semibold leading-snug">{copy.headline}</h3>
          </div>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">{copy.body}</p>
        </div>
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:flex-shrink-0">
          <Button
            size="sm"
            className="gap-2 w-full md:w-auto justify-center"
            onClick={() => setLocation(primaryHref)}
            data-testid={`upsell-primary-${variant}`}
          >
            <Sparkles className="h-4 w-4" />
            <span className="truncate">{copy.primaryCta}</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 w-full md:w-auto justify-center"
            onClick={() => setLocation(secondaryHref)}
            data-testid={`upsell-secondary-${variant}`}
          >
            <CreditCard className="h-4 w-4" />
            <span className="truncate">{copy.secondaryCta}</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
