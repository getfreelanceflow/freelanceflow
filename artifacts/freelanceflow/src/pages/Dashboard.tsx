import { Link } from "wouter";
import { 
  useGetDashboardSummary, 
  getGetDashboardSummaryQueryKey,
  useGetRecentProposals,
  getGetRecentProposalsQueryKey,
  useGetTopJobs,
  getGetTopJobsQueryKey 
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { FileText, CheckCircle2, Bookmark, TrendingUp, ArrowRight, Briefcase } from "lucide-react";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });
  const { data: recentProposals, isLoading: isLoadingProposals } = useGetRecentProposals({
    query: { queryKey: getGetRecentProposalsQueryKey() }
  });
  const { data: topJobs, isLoading: isLoadingJobs } = useGetTopJobs({
    query: { queryKey: getGetTopJobsQueryKey() }
  });

  const pieData = summary ? [
    { name: 'Draft', value: summary.proposalsByStatus.draft, color: '#64748b' },
    { name: 'Sent', value: summary.proposalsByStatus.sent, color: '#3b82f6' },
    { name: 'Accepted', value: summary.proposalsByStatus.accepted, color: '#22c55e' },
    { name: 'Rejected', value: summary.proposalsByStatus.rejected, color: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Overview of your freelance performance and top opportunities.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard 
          title="Total Proposals" 
          value={summary?.totalProposals} 
          icon={FileText} 
          isLoading={isLoadingSummary} 
        />
        <MetricCard 
          title="Accepted Proposals" 
          value={summary?.acceptedProposals} 
          icon={CheckCircle2} 
          isLoading={isLoadingSummary} 
        />
        <MetricCard 
          title="Saved Jobs" 
          value={summary?.savedJobs} 
          icon={Bookmark} 
          isLoading={isLoadingSummary} 
        />
        <MetricCard 
          title="Success Rate" 
          value={summary ? `${summary.successRate}%` : undefined} 
          icon={TrendingUp} 
          isLoading={isLoadingSummary} 
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>Proposal Status</CardTitle>
            <CardDescription>Breakdown of your generated proposals.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-[200px] w-[200px] rounded-full" />
              </div>
            ) : pieData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No proposals yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Proposals</CardTitle>
              <CardDescription>Your latest AI-generated applications.</CardDescription>
            </div>
            <Link href="/proposals">
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoadingProposals ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : recentProposals && recentProposals.length > 0 ? (
              <div className="space-y-4">
                {recentProposals.map(proposal => (
                  <div key={proposal.id} className="flex items-center justify-between rounded-lg border p-4 bg-card/50">
                    <div className="space-y-1 overflow-hidden">
                      <p className="font-medium truncate">{proposal.jobTitle}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize text-xs">{proposal.status}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(proposal.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground border border-dashed rounded-lg">
                <p>No recent proposals.</p>
                <Link href="/jobs">
                  <Button variant="link" className="mt-2 text-primary">Find a job to apply to</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Top Job Matches</CardTitle>
            <CardDescription>Jobs that best match your profile and skills.</CardDescription>
          </div>
          <Link href="/jobs">
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              View Feed <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoadingJobs ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          ) : topJobs && topJobs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {topJobs.map(job => (
                <div key={job.id} className="rounded-lg border p-4 hover:border-primary/50 transition-colors flex flex-col justify-between">
                  <div className="space-y-2">
                    <h3 className="font-semibold line-clamp-2" title={job.title}>{job.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Briefcase className="h-4 w-4" />
                      <span>${job.budgetMin} - ${job.budgetMax}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                      {job.successScore}% Match
                    </Badge>
                    <Link href={`/jobs/${job.id}`}>
                      <Button variant="ghost" size="sm">Details</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No recommended jobs right now.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, isLoading }: { title: string, value?: string | number, icon: any, isLoading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">{value !== undefined ? value : '-'}</div>
        )}
      </CardContent>
    </Card>
  );
}