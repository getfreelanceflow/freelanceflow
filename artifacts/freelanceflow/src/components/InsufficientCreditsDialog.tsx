import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Zap, Sparkles, CreditCard } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useGetBillingMe, getGetBillingMeQueryKey } from "@workspace/api-client-react";

export type InsufficientCreditsDetail = {
  message?: string;
  have?: number;
  needed?: number;
  action?: string;
};

export const INSUFFICIENT_CREDITS_EVENT = "ff:insufficient-credits";

export function emitInsufficientCredits(detail: InsufficientCreditsDetail) {
  window.dispatchEvent(new CustomEvent(INSUFFICIENT_CREDITS_EVENT, { detail }));
}

export default function InsufficientCreditsDialog() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<InsufficientCreditsDetail | null>(null);
  const me = useGetBillingMe({ query: { queryKey: getGetBillingMeQueryKey(), enabled: open } });

  useEffect(() => {
    function handler(e: Event) {
      const ce = e as CustomEvent<InsufficientCreditsDetail>;
      setDetail(ce.detail ?? null);
      setOpen(true);
    }
    window.addEventListener(INSUFFICIENT_CREDITS_EVENT, handler);
    return () => window.removeEventListener(INSUFFICIENT_CREDITS_EVENT, handler);
  }, []);

  const have = detail?.have ?? me.data?.credits ?? 0;
  const needed = detail?.needed ?? 1;
  const plan = me.data?.plan ?? "free";
  const onFree = plan === "free";

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            You're out of credits
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action needs <span className="font-semibold">{needed} credit{needed === 1 ? "" : "s"}</span>, but you have{" "}
            <span className="font-semibold">{have}</span>. Upgrade your plan or top up with a credit pack to keep going.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-2 pt-2 sm:grid-cols-2">
          {onFree ? (
            <Button
              className="w-full justify-start gap-2"
              onClick={() => {
                setOpen(false);
                setLocation("/billing");
              }}
              data-testid="cta-upgrade"
            >
              <Sparkles className="h-4 w-4" />
              Upgrade to Pro
            </Button>
          ) : (
            <Button
              className="w-full justify-start gap-2"
              onClick={() => {
                setOpen(false);
                setLocation("/billing");
              }}
              data-testid="cta-manage"
            >
              <Sparkles className="h-4 w-4" />
              Manage plan
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => {
              setOpen(false);
              setLocation("/billing");
            }}
            data-testid="cta-credits"
          >
            <CreditCard className="h-4 w-4" />
            Buy credits
          </Button>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Not now</AlertDialogCancel>
          <AlertDialogAction onClick={() => setLocation("/pricing")}>See pricing</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
