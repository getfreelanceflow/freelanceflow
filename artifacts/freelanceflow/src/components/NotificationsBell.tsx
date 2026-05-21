import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Bell, AlarmClock, Receipt, Sparkles, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useListNotifications, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useT } from "@/i18n/LanguageContext";

const READ_KEY = "ff_notifications_read_v1";

function loadRead(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(arr) ? (arr as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveRead(read: Set<string>) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...read]));
  } catch {
    /* ignore */
  }
}

function iconFor(kind: string) {
  switch (kind) {
    case "invoice_overdue":
      return <AlarmClock className="h-4 w-4 text-destructive" />;
    case "invoice_due_soon":
      return <Receipt className="h-4 w-4 text-amber-500" />;
    case "followup_due":
      return <Mail className="h-4 w-4 text-blue-500" />;
    case "job_match":
      return <Sparkles className="h-4 w-4 text-primary" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

export default function NotificationsBell() {
  const { t } = useT();
  const { data, isLoading } = useListNotifications({
    query: {
      queryKey: getListNotificationsQueryKey(),
      refetchInterval: 60_000,
      staleTime: 30_000,
    },
  });
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<Set<string>>(() => loadRead());

  const items = data ?? [];
  const unread = items.filter((n) => !read.has(n.id));

  useEffect(() => {
    if (!open) return;
    // Mark all currently-visible items as read after opening
    const t = setTimeout(() => {
      setRead((prev) => {
        const next = new Set(prev);
        for (const n of items) next.add(n.id);
        saveRead(next);
        return next;
      });
    }, 800);
    return () => clearTimeout(t);
  }, [open, items]);

  const [, navigate] = useLocation();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={t("header.notifications")}
          data-testid="notifications-bell"
        >
          <Bell className="h-5 w-5" />
          {unread.length > 0 ? (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full px-1 text-[10px] tabular-nums"
            >
              {unread.length > 9 ? "9+" : unread.length}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">{t("header.notifications")}</span>
          {items.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              {unread.length > 0 ? t("header.unreadCount", { n: unread.length }) : t("header.allCaughtUp")}
            </span>
          ) : null}
        </div>
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {t("header.loading")}
            </div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {t("header.allCaughtUp")}
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const isUnread = !read.has(n.id);
                return (
                  <li
                    key={n.id}
                    className={`px-4 py-3 hover:bg-accent/40 cursor-pointer ${
                      isUnread ? "bg-accent/20" : ""
                    }`}
                    onClick={() => {
                      setOpen(false);
                      navigate(n.href);
                    }}
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5">{iconFor(n.kind)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {n.body}
                        </p>
                      </div>
                      {isUnread ? (
                        <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
