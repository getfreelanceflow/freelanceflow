import { useEffect, useState } from "react";
import { api, type PublicReview } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { toast } from "sonner";

function Stars({ value, size = 4 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-${size} w-${size} ${
            n <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export default function PackageReviews({ slug }: { slug: string }) {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [authorName, setAuthorName] = useState("");
  const [authorRole, setAuthorRole] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api
      .getPublicReviews(slug)
      .then((r) => {
        setReviews(r.reviews);
        setAverage(r.average);
        setCount(r.count);
      })
      .catch(() => {});
  }, [slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!authorName.trim() || comment.trim().length < 5) {
      toast.error("Please share a name and a review of at least 5 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await api.submitPublicReview(slug, {
        authorName: authorName.trim(),
        authorRole: authorRole.trim() || undefined,
        authorEmail: authorEmail.trim() || undefined,
        rating,
        comment: comment.trim(),
      });
      setSubmitted(true);
      setFormOpen(false);
      toast.success("Thanks! Your review will appear once the freelancer approves it.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-2">
      <CardContent className="p-6 sm:p-10 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold">Reviews</h2>
            {count > 0 && average != null ? (
              <div className="flex items-center gap-3 mt-2">
                <Stars value={Math.round(average)} />
                <span className="text-sm text-muted-foreground">
                  {average.toFixed(1)} · {count} review{count === 1 ? "" : "s"}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                Be the first to share your experience.
              </p>
            )}
          </div>
          {!submitted && (
            <Button variant={formOpen ? "outline" : "default"} onClick={() => setFormOpen((v) => !v)}>
              {formOpen ? "Cancel" : "Write a review"}
            </Button>
          )}
        </div>

        {formOpen && (
          <form
            onSubmit={submit}
            className="space-y-4 rounded-lg border bg-muted/30 p-4 sm:p-6"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rev-name">
                  Your name<span className="text-destructive"> *</span>
                </Label>
                <Input
                  id="rev-name"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  required
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rev-role">Role / Company (optional)</Label>
                <Input
                  id="rev-role"
                  value={authorRole}
                  onChange={(e) => setAuthorRole(e.target.value)}
                  placeholder="CTO at Acme"
                  maxLength={120}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rev-email">Email (kept private)</Label>
              <Input
                id="rev-email"
                type="email"
                value={authorEmail}
                onChange={(e) => setAuthorEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Rating<span className="text-destructive"> *</span>
              </Label>
              <div
                className="flex gap-1"
                onMouseLeave={() => setHoverRating(0)}
                role="radiogroup"
                aria-label="Rating"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    className="p-1 -m-1"
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        n <= (hoverRating || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rev-comment">
                Your review<span className="text-destructive"> *</span>
              </Label>
              <Textarea
                id="rev-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                required
                maxLength={2000}
                placeholder="What was it like working together?"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit review"}
              </Button>
            </div>
          </form>
        )}

        {reviews.length > 0 && (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-lg border p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-semibold">{r.authorName}</span>
                  {r.authorRole && (
                    <span className="text-sm text-muted-foreground">· {r.authorRole}</span>
                  )}
                  <div className="ml-auto">
                    <Stars value={r.rating} />
                  </div>
                </div>
                <p className="text-sm mt-2 whitespace-pre-wrap">{r.comment}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
