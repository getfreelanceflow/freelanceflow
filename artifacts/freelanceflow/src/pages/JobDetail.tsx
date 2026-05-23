import { useParams, Link } from "wouter";
import {
  useGetJob,
  getGetJobQueryKey,
  useSaveJob,
  getListSavedJobsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Bookmark, Briefcase, Calendar, DollarSign, MapPin, Star, Zap } from "lucide-react";
import { useGetBillingMe, getGetBillingMeQueryKey } from "@workspace/api-client-react";
import HighValueJobBadge from "@/components/HighValueJobBadge";
import ProUpsellCard from "@/components/ProUpsellCard";
import { isFreeUser, isHighValueJob } from "@/lib/paywallSignals";

export default function JobDetail() {
  const { id } = useParams();
  const jobId = parseInt(id || "0", 10);
  const qc = useQueryClient();

  const { data: job, isLoading, error } = useGetJob(jobId, {
    query: { enabled: !!jobId, queryKey: getGetJobQueryKey(jobId) }
  });
  const { data: billing } = useGetBillingMe({
    query: { queryKey: getGetBillingMeQueryKey(), staleTime: 60_000 },
  });

  const saveJob = useSaveJob({
    mutation: {
      onSuccess: () => {
        toast.success("Job saved");
        qc.invalidateQueries({ queryKey: getListSavedJobsQueryKey() });
      },
      onError: (err: unknown) => {
        const msg = (err as { error?: string })?.error || "Could not save job";
        toast.error(msg);
      },
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-32" />
        <Card>
          <CardHeader>
            <Skeleton className="h-10 w-3/4 mb-4" />
            <div className="flex gap-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-24" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-destructive">Job not found</h2>
        <p className="text-muted-foreground mt-2">The job you are looking for does not exist or has been removed.</p>
        <Link href="/jobs">
          <Button variant="outline" className="mt-6">Back to Jobs</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/jobs">
        <Button variant="ghost" className="mb-2 -ml-4 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Feed
        </Button>
      </Link>

      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{job.title}</h1>
            {isHighValueJob(job) && <HighValueJobBadge />}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
            <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" /> {job.platform}</span>
            <span className="flex items-center gap-1.5"><DollarSign className="h-4 w-4" /> ${job.budgetMin} - ${job.budgetMax}</span>
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {new Date(job.postedAt).toLocaleDateString()}</span>
            {job.location ? (
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {job.location}</span>
            ) : null}
            <Badge variant="outline" className="capitalize">
              {job.jobType === "onsite" ? "In-person" : job.jobType}
            </Badge>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-4 py-2 text-sm whitespace-nowrap">
            <Zap className="mr-1.5 h-4 w-4" /> {job.successScore}% Match
          </Badge>
          <Link href={`/proposals/new?jobId=${job.id}`} className="flex-1 md:flex-auto">
            <Button className="w-full shadow-lg shadow-primary/20">Generate AI Proposal</Button>
          </Link>
        </div>
      </div>

      {isHighValueJob(job) && isFreeUser(billing) && (
        <ProUpsellCard
          variant="high_value_job"
          context={`Budget up to $${job.budgetMax.toLocaleString()} · ${job.successScore}% match`}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap">
                {job.description}
              </div>
              <div className="mt-8">
                <h4 className="text-sm font-medium mb-3 text-foreground">Required Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill, idx) => (
                    <Badge key={idx} variant="outline" className="bg-background">{skill}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Client Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {job.clientName ? (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Name</p>
                    <p className="font-medium">{job.clientName}</p>
                  </div>
                  {job.clientRating && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Rating</p>
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="font-medium text-foreground">{job.clientRating.toFixed(1)}</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-sm italic">Client info hidden</p>
              )}
              
              <div className="pt-4 mt-4 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => saveJob.mutate({ data: { jobId: job.id } })}
                  disabled={saveJob.isPending}
                >
                  <Bookmark className="mr-2 h-4 w-4" />
                  {saveJob.isPending ? "Saving…" : "Save Job"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}