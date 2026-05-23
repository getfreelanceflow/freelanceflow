import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateJob,
  getListJobsQueryKey,
  getListMyJobsQueryKey,
} from "@workspace/api-client-react";

const CATEGORIES = [
  "Web Development",
  "Mobile Development",
  "Backend Development",
  "DevOps",
  "Data Science",
  "AI/ML",
  "UI/UX Design",
  "Graphic Design",
  "Writing",
  "Marketing",
  "SEO",
  "Video",
  "Voice",
  "Virtual Assistant",
  "Sales",
  "Customer Support",
  "Finance",
  "Legal",
  "Translation",
  "Photography",
];

interface PostJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const emptyForm = {
  title: "",
  description: "",
  category: "Web Development",
  budgetMin: "",
  budgetMax: "",
  skills: "",
  jobType: "remote" as "remote" | "onsite" | "hybrid",
  location: "",
  applyUrl: "",
  contactEmail: "",
  contactPhone: "",
};

export default function PostJobDialog({ open, onOpenChange }: PostJobDialogProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const createJob = useCreateJob({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Job posted",
          description: "Your job is now visible in the community feed.",
        });
        qc.invalidateQueries({ queryKey: getListJobsQueryKey() });
        qc.invalidateQueries({ queryKey: getListMyJobsQueryKey() });
        setForm(emptyForm);
        onOpenChange(false);
      },
      onError: (err: unknown) => {
        const msg =
          (err as { error?: string; message?: string })?.error ||
          (err as { message?: string })?.message ||
          "Failed to post job. Please check your inputs.";
        toast({ title: "Couldn't post job", description: msg, variant: "destructive" });
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const min = parseFloat(form.budgetMin);
    const max = parseFloat(form.budgetMax);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      toast({
        title: "Invalid budget",
        description: "Enter both minimum and maximum budget as numbers.",
        variant: "destructive",
      });
      return;
    }
    if (max < min) {
      toast({
        title: "Invalid budget",
        description: "Maximum budget must be greater than or equal to minimum.",
        variant: "destructive",
      });
      return;
    }

    createJob.mutate({
      data: {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        budgetMin: min,
        budgetMax: max,
        skills: form.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 20),
        jobType: form.jobType,
        location: form.location.trim() || null,
        applyUrl: form.applyUrl.trim() || null,
        contactEmail: form.contactEmail.trim() || null,
        contactPhone: form.contactPhone.trim() || null,
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !createJob.isPending && onOpenChange(v)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            Post a job
          </DialogTitle>
          <DialogDescription>
            Share a freelance opportunity with the FreelanceFlow community. Your job
            will appear in the public Jobs feed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="job-title">Title *</Label>
            <Input
              id="job-title"
              required
              minLength={3}
              maxLength={200}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Build a landing page in Next.js"
              data-testid="post-job-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="job-description">Description *</Label>
            <Textarea
              id="job-description"
              required
              minLength={10}
              maxLength={5000}
              rows={5}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What needs to be done, deliverables, timeline, etc."
              data-testid="post-job-description"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Job type</Label>
              <Select
                value={form.jobType}
                onValueChange={(v) =>
                  setForm({ ...form, jobType: v as typeof form.jobType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="job-budget-min">Budget min (USD) *</Label>
              <Input
                id="job-budget-min"
                type="number"
                inputMode="numeric"
                min={0}
                required
                value={form.budgetMin}
                onChange={(e) => setForm({ ...form, budgetMin: e.target.value })}
                placeholder="500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-budget-max">Budget max (USD) *</Label>
              <Input
                id="job-budget-max"
                type="number"
                inputMode="numeric"
                min={0}
                required
                value={form.budgetMax}
                onChange={(e) => setForm({ ...form, budgetMax: e.target.value })}
                placeholder="2000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="job-skills">Skills (comma-separated)</Label>
            <Input
              id="job-skills"
              value={form.skills}
              onChange={(e) => setForm({ ...form, skills: e.target.value })}
              placeholder="React, TypeScript, Tailwind"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="job-location">Location (optional)</Label>
            <Input
              id="job-location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Remote · or city, country"
            />
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <p className="text-sm font-medium">How candidates can reach you</p>
            <div className="space-y-2">
              <Label htmlFor="job-apply-url" className="text-xs text-muted-foreground">
                Apply URL
              </Label>
              <Input
                id="job-apply-url"
                type="url"
                value={form.applyUrl}
                onChange={(e) => setForm({ ...form, applyUrl: e.target.value })}
                placeholder="https://yourcompany.com/jobs/123"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="job-contact-email" className="text-xs text-muted-foreground">
                  Contact email
                </Label>
                <Input
                  id="job-contact-email"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  placeholder="hiring@yourcompany.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-contact-phone" className="text-xs text-muted-foreground">
                  Contact phone
                </Label>
                <Input
                  id="job-contact-phone"
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  placeholder="+1 555 123 4567"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createJob.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createJob.isPending} data-testid="post-job-submit">
              {createJob.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting…
                </>
              ) : (
                "Post job"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
