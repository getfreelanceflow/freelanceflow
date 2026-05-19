import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useCreateProposal, 
  useGetJob,
  getGetJobQueryKey,
  getListProposalsQueryKey,
  getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Bot, Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const formSchema = z.object({
  jobTitle: z.string().min(2, "Job title is required"),
  jobDescription: z.string().min(10, "Job description is required"),
  mySkills: z.string().min(2, "Skills are required to personalize the proposal"),
  budget: z.string().optional(),
  tone: z.string().default("professional"),
  jobId: z.number().optional()
});

export default function ProposalNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createProposal = useCreateProposal();
  const [result, setResult] = useState<string | null>(null);

  // Parse jobId from URL query manually since wouter doesn't have useSearchParams
  const searchParams = new URLSearchParams(window.location.search);
  const jobIdParam = searchParams.get("jobId");
  const jobId = jobIdParam ? parseInt(jobIdParam, 10) : undefined;

  const { data: job } = useGetJob(jobId || 0, {
    query: { enabled: !!jobId, queryKey: getGetJobQueryKey(jobId || 0) }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobTitle: "",
      jobDescription: "",
      mySkills: "",
      budget: "",
      tone: "professional",
      jobId: jobId
    }
  });

  // Prefill form if job data loads
  useEffect(() => {
    if (job) {
      form.reset({
        ...form.getValues(),
        jobTitle: job.title,
        jobDescription: job.description,
        jobId: job.id,
        budget: job.budgetMax ? `$${job.budgetMin} - $${job.budgetMax}` : ""
      });
    }
  }, [job, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createProposal.mutate({ data: values }, {
      onSuccess: (data) => {
        setResult(data.content);
        toast({ title: "Success", description: "AI Proposal generated successfully!" });
        queryClient.invalidateQueries({ queryKey: getListProposalsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      },
      onError: (err) => {
        toast({ title: "Error", description: (err as { error?: string }).error || "Generation failed", variant: "destructive" });
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/proposals">
        <Button variant="ghost" className="-ml-4 text-muted-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Proposals
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bot className="h-8 w-8 text-primary" /> AI Proposal Generator
        </h1>
        <p className="text-muted-foreground mt-2">Let our AI craft a personalized, high-converting pitch for you.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="order-2 lg:order-1">
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
            <CardDescription>Provide info about the job and your expertise.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. React Native Developer for mobile app" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="jobDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Paste the full job description here..." 
                          className="min-h-[150px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mySkills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>My Relevant Skills / Experience</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 5 yrs React, built 3 fintech apps" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Proposed Rate/Budget</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. $50/hr or $2000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Writing Tone</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select tone" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="casual">Casual & Friendly</SelectItem>
                            <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                            <SelectItem value="direct">Direct & Concise</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createProposal.isPending}>
                  {createProposal.isPending ? (
                    <><Sparkles className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="mr-2 h-4 w-4" /> Generate Proposal</>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="order-1 lg:order-2 bg-sidebar border-sidebar-border">
          <CardHeader>
            <CardTitle>Generated Result</CardTitle>
            <CardDescription>Your AI-crafted proposal will appear here.</CardDescription>
          </CardHeader>
          <CardContent>
            {createProposal.isPending ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            ) : result ? (
              <div className="space-y-4">
                <div className="p-4 rounded-md bg-background border whitespace-pre-wrap text-sm font-mono leading-relaxed h-[400px] overflow-y-auto">
                  {result}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="w-full" onClick={() => {
                    navigator.clipboard.writeText(result);
                    toast({ title: "Copied!", description: "Copied to clipboard." });
                  }}>
                    Copy to Clipboard
                  </Button>
                  <Button className="w-full" onClick={() => setLocation("/proposals")}>
                    Save & View List
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed border-sidebar-border rounded-lg p-6">
                <Bot className="h-10 w-10 mb-4 opacity-50" />
                <p>Fill out the job details and hit generate to create a winning proposal.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}