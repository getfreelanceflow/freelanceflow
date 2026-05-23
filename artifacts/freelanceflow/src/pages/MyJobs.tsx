import { useState } from "react";
import { Link } from "wouter";
import {
  useListMyJobs,
  useDeleteJob,
  getListMyJobsQueryKey,
  getListJobsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useToast } from "@/hooks/use-toast";
import {
  Briefcase,
  DollarSign,
  MapPin,
  PlusCircle,
  Trash2,
  Loader2,
} from "lucide-react";
import PostJobDialog from "@/components/PostJobDialog";

export default function MyJobs() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [postOpen, setPostOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: number; title: string } | null>(null);

  const { data: jobs, isLoading, isError, refetch } = useListMyJobs();

  const deleteJob = useDeleteJob({
    mutation: {
      onSuccess: () => {
        toast({ title: "Job deleted" });
        qc.invalidateQueries({ queryKey: getListMyJobsQueryKey() });
        qc.invalidateQueries({ queryKey: getListJobsQueryKey() });
        setPendingDelete(null);
      },
      onError: (err: unknown) => {
        toast({
          title: "Couldn't delete",
          description:
            (err as { error?: string; message?: string })?.error ||
            (err as { message?: string })?.message ||
            "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Posted Jobs</h1>
          <p className="text-muted-foreground mt-2">
            Jobs you've posted to the community feed.
          </p>
        </div>
        <Button onClick={() => setPostOpen(true)} data-testid="my-jobs-post-button">
          <PlusCircle className="mr-2 h-4 w-4" />
          Post a job
        </Button>
      </div>

      {isError ? (
        <div className="py-20 text-center border rounded-lg bg-card/50">
          <h3 className="text-lg font-medium">Couldn't load your jobs</h3>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : jobs && jobs.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {jobs.map((job) => (
            <Card key={job.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-xl leading-tight">
                    <Link href={`/jobs/${job.id}`} className="hover:text-primary transition-colors">
                      {job.title}
                    </Link>
                  </CardTitle>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 flex-shrink-0">
                    Community
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" /> {job.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" /> ${job.budgetMin} - ${job.budgetMax}
                  </span>
                  {job.location ? (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> {job.location}
                    </span>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3">{job.description}</p>
                {job.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {job.skills.map((s, i) => (
                      <Badge key={i} variant="outline" className="bg-background">
                        {s}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </CardContent>
              <CardFooter className="border-t border-border/50 bg-muted/20 pt-4 mt-4 flex justify-between">
                <Link href={`/jobs/${job.id}`}>
                  <Button variant="outline" size="sm">View</Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setPendingDelete({ id: job.id, title: job.title })}
                  data-testid={`my-job-delete-${job.id}`}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border rounded-lg bg-card/50">
          <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">You haven't posted any jobs yet</h3>
          <p className="text-muted-foreground mt-1">
            Share an opportunity with the community to find freelancers.
          </p>
          <Button className="mt-4" onClick={() => setPostOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Post your first job
          </Button>
        </div>
      )}

      <PostJobDialog open={postOpen} onOpenChange={setPostOpen} />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(v) => !v && !deleteJob.isPending && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this job?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.title}" will be removed from the community feed. This can't
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteJob.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete) deleteJob.mutate({ id: pendingDelete.id });
              }}
              disabled={deleteJob.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteJob.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
