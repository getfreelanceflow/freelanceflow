import { useState, useEffect } from "react";
import { Link } from "wouter";
import { 
  useListJobs, 
  getListJobsQueryKey,
  useSaveJob,
  getGetDashboardSummaryQueryKey,
  getListSavedJobsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Search, Bookmark, Zap, Briefcase, DollarSign, Loader2, X } from "lucide-react";

const POSTED_WITHIN_OPTIONS = [
  { value: "any", label: "Any time" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
] as const;

const PLATFORM_OPTIONS = [
  "Upwork",
  "Fiverr",
  "Toptal",
  "Freelancer",
  "Contra",
  "Direct",
] as const;

type PostedWithin = (typeof POSTED_WITHIN_OPTIONS)[number]["value"];

export default function Jobs() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [postedWithin, setPostedWithin] = useState<PostedWithin>("any");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const minBudgetNum = minBudget ? Number(minBudget) : undefined;
  const maxBudgetNum = maxBudget ? Number(maxBudget) : undefined;

  const queryParams = {
    search: debouncedSearch || undefined,
    category: category !== "all" ? category : undefined,
    platform: platform !== "all" ? platform : undefined,
    postedWithin: postedWithin !== "any" ? postedWithin : undefined,
    minBudget: Number.isFinite(minBudgetNum) ? minBudgetNum : undefined,
    maxBudget: Number.isFinite(maxBudgetNum) ? maxBudgetNum : undefined,
  };

  const { data: jobs, isLoading, isFetching, isError, error, refetch } = useListJobs(queryParams, {
    query: {
      queryKey: getListJobsQueryKey(queryParams),
      placeholderData: keepPreviousData,
      refetchOnMount: "always",
      retry: 1,
    },
  });

  const hasActiveFilter =
    debouncedSearch.length > 0 ||
    category !== "all" ||
    platform !== "all" ||
    postedWithin !== "any" ||
    minBudget !== "" ||
    maxBudget !== "";

  const clearAllFilters = () => {
    setSearch("");
    setCategory("all");
    setPlatform("all");
    setPostedWithin("any");
    setMinBudget("");
    setMaxBudget("");
  };

  const saveJob = useSaveJob();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSaveJob = (jobId: number) => {
    saveJob.mutate({ data: { jobId } }, {
      onSuccess: () => {
        toast({ title: "Job Saved", description: "You can view it in your Saved Jobs." });
        queryClient.invalidateQueries({ queryKey: getListSavedJobsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      },
      onError: (err) => {
        toast({ title: "Error", description: (err as { error?: string }).error || "Failed to save job", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Job Feed</h1>
        <p className="text-muted-foreground mt-2">Find your next freelance gig with AI-powered matching.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, skill, category, client, or platform..."
            className="pl-9 pr-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="jobs-search-input"
          />
          {isFetching ? (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          ) : search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Web Development">Web Development</SelectItem>
            <SelectItem value="Mobile Development">Mobile Development</SelectItem>
            <SelectItem value="Backend Development">Backend Development</SelectItem>
            <SelectItem value="DevOps">DevOps</SelectItem>
            <SelectItem value="Data Science">Data Science</SelectItem>
            <SelectItem value="AI/ML">AI / ML</SelectItem>
            <SelectItem value="UI/UX Design">UI / UX Design</SelectItem>
            <SelectItem value="Graphic Design">Graphic Design</SelectItem>
            <SelectItem value="Writing">Writing</SelectItem>
            <SelectItem value="Marketing">Marketing</SelectItem>
            <SelectItem value="SEO">SEO</SelectItem>
            <SelectItem value="Video">Video</SelectItem>
            <SelectItem value="Voice">Voice / Audio</SelectItem>
            <SelectItem value="Virtual Assistant">Virtual Assistant</SelectItem>
            <SelectItem value="Sales">Sales</SelectItem>
            <SelectItem value="Customer Support">Customer Support</SelectItem>
            <SelectItem value="Finance">Finance</SelectItem>
            <SelectItem value="Legal">Legal</SelectItem>
            <SelectItem value="Translation">Translation</SelectItem>
            <SelectItem value="Photography">Photography</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card/30 p-3">
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {PLATFORM_OPTIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={postedWithin}
          onValueChange={(v) => setPostedWithin(v as PostedWithin)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Posted" />
          </SelectTrigger>
          <SelectContent>
            {POSTED_WITHIN_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Budget</span>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Min"
            className="w-24"
            value={minBudget}
            onChange={(e) => setMinBudget(e.target.value)}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Max"
            className="w-24"
            value={maxBudget}
            onChange={(e) => setMaxBudget(e.target.value)}
          />
        </div>
        {hasActiveFilter ? (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="ml-auto">
            <X className="mr-1 h-4 w-4" /> Clear all
          </Button>
        ) : null}
      </div>

      {isError ? (
        <div className="py-20 text-center border rounded-lg bg-card/50">
          <h3 className="text-lg font-medium">Couldn't load jobs</h3>
          <p className="text-muted-foreground mt-1">
            {(error as { error?: string; message?: string } | null)?.error
              || (error as { message?: string } | null)?.message
              || "Something went wrong. Please try again."}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="flex flex-col">
              <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
              <CardContent className="flex-1 space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : jobs && jobs.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
          {jobs.map((job) => (
            <Card key={job.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <CardTitle className="text-xl leading-tight">
                      <Link href={`/jobs/${job.id}`} className="hover:text-primary transition-colors">
                        {job.title}
                      </Link>
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" /> {job.platform}</span>
                      <span className="flex items-center gap-1"><DollarSign className="h-4 w-4" /> ${job.budgetMin} - ${job.budgetMax}</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 flex-shrink-0 flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {job.successScore}% Match
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-muted-foreground line-clamp-3 text-sm">{job.description}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {job.skills.map((skill, idx) => (
                    <Badge key={idx} variant="outline" className="bg-background">{skill}</Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t border-border/50 bg-muted/20 pt-4 mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleSaveJob(job.id)}
                  disabled={saveJob.isPending}
                >
                  <Bookmark className="mr-2 h-4 w-4" /> Save
                </Button>
                <Link href={`/proposals/new?jobId=${job.id}`}>
                  <Button size="sm">
                    Generate Proposal
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border rounded-lg bg-card/50">
          <Search className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">
            {hasActiveFilter ? "No jobs match your filters" : "No jobs available yet"}
          </h3>
          <p className="text-muted-foreground mt-1">
            {hasActiveFilter
              ? `Nothing matched ${debouncedSearch ? `"${debouncedSearch}"` : "your filters"}. Try a different search term or category.`
              : "There's nothing in the job feed right now. Try reloading, or seed sample data from the Dashboard."}
          </p>
          <div className="flex gap-2 justify-center mt-4">
            {hasActiveFilter ? (
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                Clear filters
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Reload
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}