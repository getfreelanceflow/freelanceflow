import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type PackageReview, type ReviewStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Check, X, Trash2, MessageSquareQuote, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const TABS: { value: ReviewStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
];

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${n <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export default function Reviews() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<ReviewStatus>("pending");

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews", tab],
    queryFn: () => api.listReviews(tab),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["reviews"] });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ReviewStatus }) =>
      api.updateReviewStatus(id, status),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: api.deleteReview,
    onSuccess: () => {
      invalidate();
      toast.success("Review deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const counts = useMemo(() => {
    return reviews.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [reviews]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <MessageSquareQuote className="h-7 w-7 text-primary" />
          Reviews & Testimonials
        </h1>
        <p className="text-muted-foreground">
          Approve client testimonials before they appear on your public package pages. Social proof
          drives conversions — published reviews show below the package details.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ReviewStatus)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-2">
              {t.label}
              {tab === t.value && counts[t.value] > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {counts[t.value]}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MessageSquareQuote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No {tab} reviews</h3>
            <p className="text-muted-foreground max-w-md mx-auto mt-2">
              {tab === "pending"
                ? "New reviews from your clients will appear here for your approval before going public."
                : tab === "published"
                  ? "Approved testimonials show on the matching package's public page."
                  : "Rejected reviews are kept here for reference."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {reviews.map((r: PackageReview) => (
            <Card key={r.id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold">{r.authorName}</span>
                      <Stars value={r.rating} />
                      {r.authorRole && (
                        <span className="text-sm text-muted-foreground">· {r.authorRole}</span>
                      )}
                    </div>
                    {r.authorEmail && (
                      <a
                        href={`mailto:${r.authorEmail}`}
                        className="text-xs text-muted-foreground hover:underline block truncate"
                      >
                        {r.authorEmail}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {r.packageTitle && (
                      <Badge variant="outline" className="max-w-[200px] truncate">
                        {r.packageTitle}
                      </Badge>
                    )}
                    {r.packageSlug && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        aria-label="Open public package page in new tab"
                        title="Open public package page"
                        onClick={() => window.open(`/p/${r.packageSlug}`, "_blank")}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{r.comment}</p>
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t text-xs text-muted-foreground">
                  <span>{new Date(r.createdAt).toLocaleString()}</span>
                  <div className="flex-1" />
                  {r.status !== "published" && (
                    <Button
                      size="sm"
                      onClick={() => setStatus.mutate({ id: r.id, status: "published" })}
                    >
                      <Check className="h-4 w-4 mr-1" /> Publish
                    </Button>
                  )}
                  {r.status !== "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatus.mutate({ id: r.id, status: "rejected" })}
                    >
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  )}
                  {r.status === "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatus.mutate({ id: r.id, status: "pending" })}
                    >
                      Move to pending
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Delete review"
                    title="Delete review"
                    onClick={() => {
                      if (confirm("Permanently delete this review?")) del.mutate(r.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
