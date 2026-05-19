import { Link } from "wouter";
import { 
  useListSavedJobs, 
  getListSavedJobsQueryKey,
  useDeleteSavedJob,
  getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BookmarkMinus, ExternalLink, Briefcase, DollarSign, Calendar } from "lucide-react";

export default function SavedJobs() {
  const { data: savedJobs, isLoading } = useListSavedJobs({
    query: { queryKey: getListSavedJobsQueryKey() }
  });
  
  const deleteSavedJob = useDeleteSavedJob();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleUnsave = (id: number) => {
    deleteSavedJob.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Removed", description: "Job removed from saved list." });
        queryClient.invalidateQueries({ queryKey: getListSavedJobsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      },
      onError: (err) => {
        toast({ title: "Error", description: (err as { error?: string }).error || "Failed to unsave job", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Saved Jobs</h1>
        <p className="text-muted-foreground mt-2">Jobs you've bookmarked to review or apply to later.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
              <CardContent><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      ) : savedJobs && savedJobs.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {savedJobs.map(({ id, job, savedAt }) => job && (
            <Card key={id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg leading-tight line-clamp-2">
                  <Link href={`/jobs/${job.id}`} className="hover:text-primary transition-colors">
                    {job.title}
                  </Link>
                </CardTitle>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {job.platform}</span>
                  <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> ${job.budgetMin}-${job.budgetMax}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex flex-wrap gap-2 mb-4">
                  {job.skills.slice(0, 3).map((skill, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs bg-background">{skill}</Badge>
                  ))}
                  {job.skills.length > 3 && <Badge variant="outline" className="text-xs">+{job.skills.length - 3}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Saved on {new Date(savedAt).toLocaleDateString()}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between border-t bg-muted/10 pt-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleUnsave(id)}
                  disabled={deleteSavedJob.isPending}
                >
                  <BookmarkMinus className="mr-2 h-4 w-4" /> Unsave
                </Button>
                <Link href={`/proposals/new?jobId=${job.id}`}>
                  <Button size="sm" variant="secondary">
                    Apply <ExternalLink className="ml-2 h-3 w-3" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border rounded-lg bg-card/50">
          <BookmarkMinus className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">No saved jobs</h3>
          <p className="text-muted-foreground mt-1">When you save jobs from the feed, they'll show up here.</p>
          <Link href="/jobs">
            <Button className="mt-6" variant="outline">Browse Jobs</Button>
          </Link>
        </div>
      )}
    </div>
  );
}