import { Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AI_COSTS, type AiAction } from "@/lib/aiCosts";
import { cn } from "@/lib/utils";

interface Props {
  action: AiAction;
  className?: string;
  variant?: "compact" | "inline";
}

export default function CreditCostBadge({ action, className, variant = "compact" }: Props) {
  const cost = AI_COSTS[action];
  if (variant === "inline") {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}>
        <Zap className="h-3 w-3 text-amber-500" aria-hidden />
        Costs {cost} credit{cost === 1 ? "" : "s"}
      </span>
    );
  }
  return (
    <Badge variant="secondary" className={cn("gap-1 font-normal", className)} data-testid={`cost-${action}`}>
      <Zap className="h-3 w-3 text-amber-500" aria-hidden />
      {cost} credit{cost === 1 ? "" : "s"}
    </Badge>
  );
}
