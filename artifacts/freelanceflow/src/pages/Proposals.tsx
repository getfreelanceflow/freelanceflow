import { Link } from "wouter";
import { 
  useListProposals, 
  getListProposalsQueryKey,
  useDeleteProposal 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { FileText, Trash2, Calendar, Edit2, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function Proposals() {
  const { data: proposals, isLoading } = useListProposals({
    query: { queryKey: getListProposalsQueryKey() }
  });
  
  const deleteProposal = useDeleteProposal();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this proposal?")) {
      deleteProposal.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Deleted", description: "Proposal removed successfully." });
          queryClient.invalidateQueries({ queryKey: getListProposalsQueryKey() });
        },
        onError: (err) => {
          toast({ title: "Error", description: (err as { error?: string }).error || "Failed to delete proposal", variant: "destructive" });
        }
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="secondary" className="bg-slate-500/20 text-slate-400"><Clock className="mr-1.5 h-3 w-3" /> Draft</Badge>;
      case 'sent': return <Badge variant="secondary" className="bg-blue-500/20 text-blue-400"><CheckCircle2 className="mr-1.5 h-3 w-3" /> Sent</Badge>;
      case 'accepted': return <Badge variant="secondary" className="bg-green-500/20 text-green-400"><CheckCircle2 className="mr-1.5 h-3 w-3" /> Accepted</Badge>;
      case 'rejected': return <Badge variant="secondary" className="bg-red-500/20 text-red-400"><XCircle className="mr-1.5 h-3 w-3" /> Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proposals</h1>
          <p className="text-muted-foreground mt-2">Manage your AI-generated proposals and applications.</p>
        </div>
        <Link href="/proposals/new">
          <Button>
            <FileText className="mr-2 h-4 w-4" /> Create New Proposal
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex justify-between">
                  <div className="space-y-3 w-full">
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : proposals && proposals.length > 0 ? (
        <div className="grid gap-4">
          {proposals.map((proposal) => (
            <Card key={proposal.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg truncate" title={proposal.jobTitle}>
                        {proposal.jobTitle}
                      </h3>
                      {getStatusBadge(proposal.status)}
                    </div>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" /> {new Date(proposal.createdAt).toLocaleDateString()}
                      </span>
                      {proposal.successProbability && (
                        <span className="text-primary font-medium">
                          {proposal.successProbability}% Win Chance
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-end md:self-center">
                    <Button variant="outline" size="sm" onClick={() => alert("Edit not implemented yet")}>
                      <Edit2 className="h-4 w-4 mr-2" /> View/Edit
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDelete(proposal.id)}
                      disabled={deleteProposal.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border rounded-lg bg-card/30">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-medium">No proposals found</h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            You haven't generated any proposals yet. Find a job you like and use our AI to craft the perfect pitch.
          </p>
          <Link href="/jobs">
            <Button className="mt-6">Browse Jobs</Button>
          </Link>
        </div>
      )}
    </div>
  );
}