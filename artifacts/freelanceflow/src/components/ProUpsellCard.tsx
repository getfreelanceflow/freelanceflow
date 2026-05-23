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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 pr-6">
          {context && <p className="text-xs uppercase tracking-wider text-primary/80">{context}</p>}
          <div className="mt-1 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" aria-hidden />
            <h3 className="text-base font-semibold leading-tight">{copy.headline}</h3>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">{copy.body}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            size="sm"
            className="gap-2"
            onClick={() => setLocation(primaryHref)}
            data-testid={`upsell-primary-${variant}`}
          >
            <Sparkles className="h-4 w-4" />
            {copy.primaryCta}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => setLocation(secondaryHref)}
            data-testid={`upsell-secondary-${variant}`}
          >
            <CreditCard className="h-4 w-4" />
            {copy.secondaryCta}
          </Button>
        </div>
      </div>
    </Card>
  );
}
