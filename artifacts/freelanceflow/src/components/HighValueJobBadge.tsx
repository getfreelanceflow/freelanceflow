import { Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

export default function HighValueJobBadge({ className }: Props) {
  return (
    <Badge
      className={cn(
        "gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300",
        className,
      )}
      variant="outline"
      data-testid="badge-high-value-job"
    >
      <Flame className="h-3 w-3" aria-hidden />
      Premium opportunity
    </Badge>
  );
}
