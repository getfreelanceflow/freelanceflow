import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type PackageInquiry, type InquiryStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Inbox,
  Star,
  Archive,
  ShieldAlert,
  Trash2,
  Mail,
  Search,
  ExternalLink,
  StarOff,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TABS: { value: string; label: string; statuses: InquiryStatus[] }[] = [
  { value: "inbox", label: "Inbox", statuses: ["new", "read"] },
  { value: "starred", label: "Starred", statuses: ["starred"] },
  { value: "archived", label: "Archived", statuses: ["archived"] },
  { value: "spam", label: "Spam", statuses: ["spam"] },
];

function fmtDate(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return d.toLocaleDateString();
}

export default function Leads() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("inbox");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const currentStatuses = TABS.find((t) => t.value === tab)?.statuses ?? [];

  const { data: inquiries = [], isLoading } = useQuery({
    queryKey: ["inquiries", currentStatuses.join(",")],
    queryFn: () => api.listInquiries(currentStatuses.join(",")),
  });
  const { data: stats } = useQuery({
    queryKey: ["inquiry-stats"],
    queryFn: api.getInquiryStats,
  });

  const filtered = useMemo(() => {
    if (!query.trim()) return inquiries;
    const q = query.trim().toLowerCase();
    return inquiries.filter(
      (i) =>
        i.name?.toLowerCase().includes(q) ||
        i.email?.toLowerCase().includes(q) ||
        i.message?.toLowerCase().includes(q) ||
        i.packageTitle?.toLowerCase().includes(q),
    );
  }, [inquiries, query]);

  const selected = filtered.find((i) => i.id === selectedId) ?? filtered[0] ?? null;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["inquiries"] });
    qc.invalidateQueries({ queryKey: ["inquiry-stats"] });
  };

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: InquiryStatus }) =>
      api.updateInquiryStatus(id, status),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: api.deleteInquiry,
    onSuccess: () => {
      invalidate();
      setSelectedId(null);
      toast.success("Lead deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Auto-mark "new" inquiries as "read" once the user opens them.
  function open(i: PackageInquiry) {
    setSelectedId(i.id);
    if (i.status === "new") {
      setStatus.mutate({ id: i.id, status: "read" });
    }
  }

  function replyMailto(i: PackageInquiry) {
    if (!i.email) return;
    const subject = `Re: ${i.packageTitle ?? "your inquiry"}`;
    const body = `Hi ${i.name ?? "there"},\n\nThanks for reaching out about ${i.packageTitle ?? "this"}${i.tier ? ` (${i.tier} tier)` : ""}.\n\n— `;
    window.location.href = `mailto:${encodeURIComponent(i.email)}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Inbox className="h-7 w-7 text-primary" />
          Lead Inbox
          {stats && stats.new > 0 && (
            <Badge className="bg-primary text-primary-foreground">{stats.new} new</Badge>
          )}
        </h1>
        <p className="text-muted-foreground">
          Every inquiry sent through your public package pages lands here. Star, archive, or reply by
          email.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v); setSelectedId(null); }}>
        <TabsList>
          {TABS.map((t) => {
            const count = t.statuses.reduce((acc, s) => acc + (stats?.[s] ?? 0), 0);
            return (
              <TabsTrigger key={t.value} value={t.value} className="gap-2">
                {t.label}
                {count > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, message, package…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid lg:grid-cols-[360px_1fr] gap-4">
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">
              {query ? "No leads match your search" : `No leads in ${TABS.find((t) => t.value === tab)?.label}`}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mt-2">
              Share a public package page with prospects. Inquiries they send will appear here in real
              time, even if email delivery fails.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-[360px_1fr] gap-4">
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {filtered.map((i) => {
              const isActive = selected?.id === i.id;
              return (
                <Card
                  key={i.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isActive}
                  aria-label={`Lead from ${i.name ?? "anonymous"}${i.packageTitle ? ` for ${i.packageTitle}` : ""}`}
                  className={cn(
                    "cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isActive ? "ring-2 ring-primary" : "hover:border-primary/40",
                    i.status === "new" && "border-l-4 border-l-primary",
                  )}
                  onClick={() => open(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      open(i);
                    }
                  }}
                >
                  <CardContent className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">
                        {i.name ?? "(anonymous click-through)"}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(i.createdAt)}
                      </span>
                    </div>
                    {i.email && (
                      <div className="text-xs text-muted-foreground truncate">{i.email}</div>
                    )}
                    <div className="flex items-center gap-2 text-xs">
                      {i.packageTitle && (
                        <Badge variant="outline" className="truncate max-w-[160px]">
                          {i.packageTitle}
                        </Badge>
                      )}
                      {i.tier && <Badge variant="secondary">{i.tier}</Badge>}
                      {i.status === "starred" && (
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      )}
                    </div>
                    {i.message && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{i.message}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {selected ? (
            <Card className="self-start">
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b">
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold">
                      {selected.name ?? "Anonymous interest"}
                    </h2>
                    {selected.email && (
                      <a
                        href={`mailto:${selected.email}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {selected.email}
                      </a>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {selected.packageTitle && (
                        <Badge variant="outline">{selected.packageTitle}</Badge>
                      )}
                      {selected.tier && (
                        <Badge variant="secondary" className="gap-1">
                          <Sparkles className="h-3 w-3" />
                          {selected.tier} tier
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(selected.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selected.email && (
                      <Button size="sm" onClick={() => replyMailto(selected)}>
                        <Mail className="h-4 w-4 mr-2" /> Reply
                      </Button>
                    )}
                    {selected.packageSlug && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          window.open(`/p/${selected.packageSlug}`, "_blank")
                        }
                      >
                        <ExternalLink className="h-4 w-4 mr-2" /> View package
                      </Button>
                    )}
                  </div>
                </div>

                {selected.aiLabel && (
                  <div
                    className={cn(
                      "rounded-md border p-3 text-sm space-y-1",
                      selected.aiLabel === "qualified" && "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900",
                      selected.aiLabel === "spam" && "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900",
                      selected.aiLabel === "exploratory" && "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900",
                    )}
                  >
                    <div className="flex items-center gap-2 font-medium">
                      <Sparkles className="h-4 w-4" />
                      AI triage:{" "}
                      <span className="capitalize">{selected.aiLabel}</span>
                      {typeof selected.aiScore === "number" && (
                        <Badge variant="outline" className="ml-auto">
                          {selected.aiScore}/100
                        </Badge>
                      )}
                    </div>
                    {selected.aiReason && (
                      <p className="text-xs text-muted-foreground">{selected.aiReason}</p>
                    )}
                  </div>
                )}

                {selected.message ? (
                  <div className="rounded-md bg-muted/40 p-4">
                    <p className="text-sm whitespace-pre-wrap">{selected.message}</p>
                  </div>
                ) : (
                  <p className="text-sm italic text-muted-foreground">
                    No message — this lead came from a one-click CTA (e.g. "Book this package").
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button
                    variant={selected.status === "starred" ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setStatus.mutate({
                        id: selected.id,
                        status: selected.status === "starred" ? "read" : "starred",
                      })
                    }
                  >
                    {selected.status === "starred" ? (
                      <>
                        <StarOff className="h-4 w-4 mr-2" /> Unstar
                      </>
                    ) : (
                      <>
                        <Star className="h-4 w-4 mr-2" /> Star
                      </>
                    )}
                  </Button>
                  {selected.status !== "archived" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setStatus.mutate({ id: selected.id, status: "archived" })
                      }
                    >
                      <Archive className="h-4 w-4 mr-2" /> Archive
                    </Button>
                  )}
                  {selected.status === "archived" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStatus.mutate({ id: selected.id, status: "read" })}
                    >
                      <Inbox className="h-4 w-4 mr-2" /> Move to inbox
                    </Button>
                  )}
                  {selected.status !== "spam" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStatus.mutate({ id: selected.id, status: "spam" })}
                    >
                      <ShieldAlert className="h-4 w-4 mr-2" /> Spam
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStatus.mutate({ id: selected.id, status: "read" })}
                    >
                      Not spam
                    </Button>
                  )}
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm("Permanently delete this lead?")) del.mutate(selected.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2 text-destructive" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Select a lead to view details
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
