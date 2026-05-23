import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useAnalyzeJob,
  useGenerateProposalDraft,
  useRegenerateProposal,
  useCreateProposal,
  useListProposalTemplates,
  useCreateProposalTemplate,
  useDeleteProposalTemplate,
  getListProposalsQueryKey,
  getListProposalTemplatesQueryKey,
  getGetDashboardSummaryQueryKey,
  useGetJob,
  getGetJobQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import CreditCostBadge from "@/components/CreditCostBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  ArrowLeft,
  Copy,
  Save,
  BookmarkPlus,
  Trash2,
  AlertTriangle,
  Target,
  Wand2,
  ScrollText,
  Library,
  Bot,
  RefreshCw,
  Loader2,
  ChevronsDown,
  ChevronsUp,
  Briefcase,
  Smile,
  Crown,
  TrendingUp,
  MessagesSquare,
  ShieldCheck,
  Search,
} from "lucide-react";

type Tone = "professional" | "casual" | "enthusiastic" | "direct" | "premium" | "friendly";
type Length = "short" | "medium" | "long";
type Transform =
  | "more_persuasive"
  | "shorter"
  | "longer"
  | "more_professional"
  | "more_friendly"
  | "premium_tone"
  | "higher_conversion"
  | "simpler"
  | "more_confident";

type AnalysisShape = {
  clientName: string | null;
  scamRisk: "none" | "low" | "medium" | "high";
  scamReasons: string[];
  budget: { level: "low" | "medium" | "high" | "unknown"; estimate: string | null };
  urgency: "low" | "medium" | "high";
  keywords: string[];
  fitScore: number;
  fitReason: string;
};

const REGEN_BUTTONS: Array<{
  key: Transform;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  testId: string;
}> = [
  { key: "more_persuasive", label: "More Persuasive", icon: Target, testId: "regen-persuasive" },
  { key: "shorter", label: "Shorter", icon: ChevronsUp, testId: "regen-shorter" },
  { key: "longer", label: "Longer", icon: ChevronsDown, testId: "regen-longer" },
  { key: "more_professional", label: "More Professional", icon: Briefcase, testId: "regen-professional" },
  { key: "more_friendly", label: "More Friendly", icon: Smile, testId: "regen-friendly" },
  { key: "premium_tone", label: "Premium Tone", icon: Crown, testId: "regen-premium" },
  { key: "higher_conversion", label: "Higher Conversion", icon: TrendingUp, testId: "regen-conversion" },
  { key: "simpler", label: "Simpler", icon: MessagesSquare, testId: "regen-simpler" },
  { key: "more_confident", label: "More Confident", icon: ShieldCheck, testId: "regen-confident" },
];

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-rose-400";
}

function scamBadge(risk: AnalysisShape["scamRisk"]) {
  const map = {
    none: { cls: "bg-emerald-500/20 text-emerald-400", label: "No scam signals" },
    low: { cls: "bg-emerald-500/20 text-emerald-400", label: "Low risk" },
    medium: { cls: "bg-amber-500/20 text-amber-400", label: "Medium risk" },
    high: { cls: "bg-rose-500/20 text-rose-400", label: "High risk" },
  } as const;
  const m = map[risk];
  return <Badge variant="outline" className={`${m.cls} border-none`}>{m.label}</Badge>;
}

function budgetBadge(level: AnalysisShape["budget"]["level"], estimate: string | null) {
  const cls =
    level === "high"
      ? "bg-emerald-500/20 text-emerald-400"
      : level === "medium"
        ? "bg-blue-500/20 text-blue-400"
        : level === "low"
          ? "bg-amber-500/20 text-amber-400"
          : "bg-slate-500/20 text-slate-400";
  return (
    <Badge variant="outline" className={`${cls} border-none capitalize`}>
      {level === "unknown" ? "Budget unknown" : `${level} budget`}
      {estimate ? ` · ${estimate}` : ""}
    </Badge>
  );
}

function urgencyBadge(u: AnalysisShape["urgency"]) {
  const cls =
    u === "high"
      ? "bg-rose-500/20 text-rose-400"
      : u === "medium"
        ? "bg-amber-500/20 text-amber-400"
        : "bg-slate-500/20 text-slate-400";
  return <Badge variant="outline" className={`${cls} border-none capitalize`}>{u} urgency</Badge>;
}

export default function ProposalStudio() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Hooks for jobId prefill
  const searchParams = new URLSearchParams(window.location.search);
  const jobIdParam = searchParams.get("jobId");
  const jobId = jobIdParam ? parseInt(jobIdParam, 10) : undefined;
  const { data: job } = useGetJob(jobId || 0, {
    query: { enabled: !!jobId, queryKey: getGetJobQueryKey(jobId || 0) },
  });

  // Form state
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [mySkills, setMySkills] = useState("");
  const [budget, setBudget] = useState("");
  const [tone, setTone] = useState<Tone>("professional");
  const [length, setLength] = useState<Length>("medium");
  const [templateId, setTemplateId] = useState<number | undefined>(undefined);

  // Output state
  const [content, setContent] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisShape | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [activeTransform, setActiveTransform] = useState<Transform | null>(null);

  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateNiche, setTemplateNiche] = useState("");

  // Mutations
  const analyzeMut = useAnalyzeJob();
  const generateMut = useGenerateProposalDraft();
  const regenerateMut = useRegenerateProposal();
  const saveMut = useCreateProposal();
  const createTemplate = useCreateProposalTemplate();
  const deleteTemplate = useDeleteProposalTemplate();
  const { data: templates } = useListProposalTemplates({
    query: { queryKey: getListProposalTemplatesQueryKey() },
  });

  // Prefill from job
  useEffect(() => {
    if (job) {
      setJobTitle(job.title);
      setJobDescription(job.description);
      if (job.budgetMin && job.budgetMax) setBudget(`$${job.budgetMin} - $${job.budgetMax}`);
    }
  }, [job]);

  const canGenerate = jobTitle.trim().length >= 2 && jobDescription.trim().length >= 10 && mySkills.trim().length >= 1;
  const canAnalyze = jobDescription.trim().length >= 10;

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setContent(prev);
  };

  const handleAnalyze = () => {
    if (!canAnalyze) {
      toast({ title: "Need job description", description: "Paste the job description first.", variant: "destructive" });
      return;
    }
    analyzeMut.mutate(
      { data: { jobTitle, jobDescription, mySkills } },
      {
        onSuccess: (res) => {
          setAnalysis(res as AnalysisShape);
          toast({ title: "Job analyzed", description: `Fit score: ${(res as AnalysisShape).fitScore}/100` });
        },
        onError: (err) => {
          toast({
            title: "Analysis failed",
            description: (err as { error?: string }).error || "Could not analyze job.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleGenerate = () => {
    if (!canGenerate) {
      toast({ title: "Fill in the basics", description: "Job title, description, and your skills are required.", variant: "destructive" });
      return;
    }
    generateMut.mutate(
      { data: { jobTitle, jobDescription, mySkills, budget: budget || undefined, tone, length, templateId } },
      {
        onSuccess: (res) => {
          setHistory((h) => (content ? [...h, content] : h));
          setContent(res.content);
          setScore(res.score ?? null);
          if (res.analysis) setAnalysis(res.analysis as AnalysisShape);
          toast({ title: "Draft generated", description: `Quality score: ${res.score}/100` });
        },
        onError: (err) => {
          toast({
            title: "Generation failed",
            description: (err as { error?: string }).error || "Could not generate proposal.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleRegen = (t: Transform) => {
    if (!content) {
      toast({ title: "Nothing to regenerate", description: "Generate a draft first.", variant: "destructive" });
      return;
    }
    setActiveTransform(t);
    regenerateMut.mutate(
      { data: { content, transform: t, jobDescription: jobDescription || undefined, tone } },
      {
        onSuccess: (res) => {
          setHistory((h) => [...h, content]);
          setContent(res.content);
          toast({ title: "Regenerated", description: REGEN_BUTTONS.find((b) => b.key === t)?.label ?? t });
        },
        onError: (err) => {
          toast({
            title: "Regenerate failed",
            description: (err as { error?: string }).error || "Could not transform proposal.",
            variant: "destructive",
          });
        },
        onSettled: () => setActiveTransform(null),
      }
    );
  };

  const handleSave = () => {
    if (!content || !jobTitle) {
      toast({ title: "Nothing to save", description: "Generate a proposal first.", variant: "destructive" });
      return;
    }
    saveMut.mutate(
      {
        data: {
          jobTitle,
          jobDescription,
          mySkills,
          budget: budget || undefined,
          tone,
          length,
          content,
          jobId: jobId,
          clientName: analysis?.clientName ?? null,
          keywords: analysis?.keywords ?? [],
          aiAnalysis: analysis ?? undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Proposal saved", description: "Added to your proposals list." });
          queryClient.invalidateQueries({ queryKey: getListProposalsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          setLocation("/proposals");
        },
        onError: (err) => {
          toast({
            title: "Save failed",
            description: (err as { error?: string }).error || "Could not save proposal.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      toast({ title: "Copied", description: "Proposal on your clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Could not access clipboard.", variant: "destructive" });
    }
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim() || !content.trim()) {
      toast({ title: "Missing fields", description: "Need a name and a draft to save as template.", variant: "destructive" });
      return;
    }
    createTemplate.mutate(
      { data: { name: templateName.trim(), content, niche: templateNiche.trim() || undefined, tone } },
      {
        onSuccess: () => {
          toast({ title: "Template saved", description: `"${templateName}" is now reusable.` });
          queryClient.invalidateQueries({ queryKey: getListProposalTemplatesQueryKey() });
          setShowSaveTemplate(false);
          setTemplateName("");
          setTemplateNiche("");
        },
        onError: (err) => {
          toast({
            title: "Save failed",
            description: (err as { error?: string }).error || "Could not save template.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleDeleteTemplate = (id: number) => {
    if (!confirm("Delete this template?")) return;
    deleteTemplate.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Template deleted" });
          queryClient.invalidateQueries({ queryKey: getListProposalTemplatesQueryKey() });
          if (templateId === id) setTemplateId(undefined);
        },
      }
    );
  };

  const wordCount = useMemo(() => content.trim().split(/\s+/).filter(Boolean).length, [content]);

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-7xl mx-auto pb-32">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Link href="/proposals">
              <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground" data-testid="back-to-proposals">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Proposals
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 mt-1">
              <Wand2 className="h-7 w-7 text-primary" /> AI Proposal Studio
              <CreditCostBadge action="proposal_generate_draft" className="ml-2 text-xs" />
            </h1>
            <p className="text-muted-foreground mt-1">
              Analyze the job, draft your pitch, and refine it with one click.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="open-templates">
                  <Library className="h-4 w-4 mr-2" /> Templates
                  {templates && templates.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{templates.length}</Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Proposal Templates</DialogTitle>
                  <DialogDescription>Pick a template to start from, or manage your saved drafts.</DialogDescription>
                </DialogHeader>
                <div className="overflow-y-auto flex-1 space-y-2 -mx-2 px-2">
                  {!templates || templates.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Library className="mx-auto h-10 w-10 opacity-40 mb-3" />
                      <p>No saved templates yet.</p>
                      <p className="text-xs mt-1">After generating a draft you like, save it as a template.</p>
                    </div>
                  ) : (
                    templates.map((t) => (
                      <Card key={t.id} className={templateId === t.id ? "border-primary" : ""}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-medium truncate">{t.name}</h4>
                                {t.niche && <Badge variant="outline" className="text-xs">{t.niche}</Badge>}
                                {t.tone && <Badge variant="outline" className="text-xs capitalize">{t.tone}</Badge>}
                                {t.useCount > 0 && (
                                  <span className="text-xs text-muted-foreground">used {t.useCount}×</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.content}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant={templateId === t.id ? "default" : "outline"}
                                onClick={() => {
                                  setTemplateId(t.id);
                                  setShowTemplates(false);
                                  toast({ title: "Template selected", description: `"${t.name}" will guide the next draft.` });
                                }}
                                data-testid={`use-template-${t.id}`}
                              >
                                {templateId === t.id ? "Selected" : "Use"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteTemplate(t.id)}
                                data-testid={`delete-template-${t.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
                {templateId && (
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setTemplateId(undefined)}>
                      Clear selection
                    </Button>
                  </DialogFooter>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT — Input + Analysis */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-primary" /> Job & Pitch
                </CardTitle>
                <CardDescription>Paste the posting, set your angle.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="jobTitle">Job title</Label>
                  <Input
                    id="jobTitle"
                    placeholder="e.g. React Native Developer for fintech app"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    data-testid="input-job-title"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="jobDescription">Job description</Label>
                  <Textarea
                    id="jobDescription"
                    placeholder="Paste the full job posting here..."
                    className="min-h-[140px]"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    data-testid="input-job-description"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mySkills">My relevant skills</Label>
                  <Input
                    id="mySkills"
                    placeholder="e.g. 5y React Native, 3 fintech apps shipped, Stripe integrations"
                    value={mySkills}
                    onChange={(e) => setMySkills(e.target.value)}
                    data-testid="input-skills"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="budget">My rate / budget</Label>
                    <Input
                      id="budget"
                      placeholder="$80/hr or $5,000"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      data-testid="input-budget"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tone</Label>
                    <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
                      <SelectTrigger data-testid="select-tone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                        <SelectItem value="direct">Direct</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Length</Label>
                    <Select value={length} onValueChange={(v) => setLength(v as Length)}>
                      <SelectTrigger data-testid="select-length">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short (~150 words)</SelectItem>
                        <SelectItem value="medium">Medium (~250 words)</SelectItem>
                        <SelectItem value="long">Long (~400 words)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Template</Label>
                    <Button
                      variant="outline"
                      className="w-full justify-start font-normal"
                      onClick={() => setShowTemplates(true)}
                      data-testid="pick-template-trigger"
                    >
                      <Library className="h-4 w-4 mr-2 shrink-0" />
                      <span className="truncate">
                        {templateId
                          ? templates?.find((t) => t.id === templateId)?.name ?? "Selected"
                          : "Optional"}
                      </span>
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleAnalyze}
                    disabled={!canAnalyze || analyzeMut.isPending}
                    className="flex-1"
                    data-testid="btn-analyze"
                  >
                    {analyzeMut.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</>
                    ) : (
                      <><Search className="h-4 w-4 mr-2" /> Analyze Job</>
                    )}
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={!canGenerate || generateMut.isPending}
                    className="flex-1"
                    data-testid="btn-generate"
                  >
                    {generateMut.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Writing...</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" /> Generate</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Analysis card */}
            {analysis && (
              <Card data-testid="analysis-card">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" /> Job Analysis
                  </CardTitle>
                  <CardDescription>
                    {analysis.clientName ? `Client: ${analysis.clientName}` : "Client name not detected"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">Fit score</span>
                      <span className={`font-semibold ${scoreColor(analysis.fitScore)}`}>
                        {analysis.fitScore}/100
                      </span>
                    </div>
                    <Progress value={analysis.fitScore} />
                    {analysis.fitReason && (
                      <p className="text-xs text-muted-foreground mt-2 italic">{analysis.fitReason}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {scamBadge(analysis.scamRisk)}
                    {budgetBadge(analysis.budget.level, analysis.budget.estimate)}
                    {urgencyBadge(analysis.urgency)}
                  </div>

                  {analysis.scamRisk !== "none" && analysis.scamRisk !== "low" && analysis.scamReasons.length > 0 && (
                    <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3">
                      <div className="flex items-center gap-2 text-rose-400 text-sm font-medium mb-1.5">
                        <AlertTriangle className="h-4 w-4" /> Watch out
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                        {analysis.scamReasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.keywords.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Keywords to weave in</div>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.keywords.map((k) => (
                          <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT — Editor + Regen toolbar */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="bg-sidebar border-sidebar-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wand2 className="h-4 w-4 text-primary" /> Your Proposal
                    </CardTitle>
                    <CardDescription>
                      Edit freely. Use the toolbar below to regenerate with a specific transformation.
                    </CardDescription>
                  </div>
                  {score !== null && (
                    <div className="flex items-center gap-3 px-3 py-1.5 rounded-md bg-background border">
                      <Target className="h-4 w-4 text-primary" />
                      <div>
                        <div className="text-xs text-muted-foreground leading-none">Quality</div>
                        <div className={`text-lg font-bold leading-tight ${scoreColor(score)}`} data-testid="score">
                          {score}<span className="text-xs text-muted-foreground font-normal">/100</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {generateMut.isPending && !content ? (
                  <div className="space-y-3 animate-pulse min-h-[420px]">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-5/6"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </div>
                ) : content ? (
                  <>
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="min-h-[420px] font-mono text-sm leading-relaxed bg-background"
                      data-testid="editor"
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                      <span>{wordCount} words</span>
                      <div className="flex items-center gap-2">
                        {history.length > 0 && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={undo} data-testid="btn-undo">
                            <RefreshCw className="h-3 w-3 mr-1.5" /> Undo last change
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="min-h-[420px] flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-md p-8">
                    <Wand2 className="h-12 w-12 mb-4 opacity-40" />
                    <p className="font-medium">Fill in the job details, then hit Generate.</p>
                    <p className="text-sm mt-1">Your AI-crafted proposal will appear here, ready to refine.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sticky Regen toolbar */}
            <div className="sticky bottom-4 z-10">
              <Card className="border-primary/20 shadow-lg bg-background/95 backdrop-blur">
                <CardContent className="p-3">
                  <Tabs defaultValue="regenerate">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <TabsList className="h-8">
                        <TabsTrigger value="regenerate" className="text-xs h-7" data-testid="tab-regenerate">
                          <Wand2 className="h-3 w-3 mr-1.5" /> Regenerate
                        </TabsTrigger>
                        <TabsTrigger value="actions" className="text-xs h-7" data-testid="tab-actions">
                          Actions
                        </TabsTrigger>
                      </TabsList>
                      {regenerateMut.isPending && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {REGEN_BUTTONS.find((b) => b.key === activeTransform)?.label ?? "Working..."}
                        </span>
                      )}
                    </div>
                    <TabsContent value="regenerate" className="mt-0">
                      <div className="flex flex-wrap gap-1.5">
                        {REGEN_BUTTONS.map(({ key, label, icon: Icon, testId }) => (
                          <Tooltip key={key}>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!content || regenerateMut.isPending}
                                onClick={() => handleRegen(key)}
                                className="h-8 text-xs"
                                data-testid={testId}
                              >
                                <Icon className="h-3.5 w-3.5 mr-1.5" />
                                {label}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Rewrite to be {label.toLowerCase()}</TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </TabsContent>
                    <TabsContent value="actions" className="mt-0">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCopy}
                          disabled={!content}
                          data-testid="btn-copy"
                        >
                          <Copy className="h-4 w-4 mr-2" /> Copy
                        </Button>
                        <Dialog open={showSaveTemplate} onOpenChange={setShowSaveTemplate}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" disabled={!content} data-testid="btn-save-template">
                              <BookmarkPlus className="h-4 w-4 mr-2" /> Save as template
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Save as template</DialogTitle>
                              <DialogDescription>
                                Reuse this draft as a starting point for future proposals.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3 py-2">
                              <div className="space-y-1.5">
                                <Label htmlFor="tplName">Name</Label>
                                <Input
                                  id="tplName"
                                  placeholder="e.g. Fintech mobile app pitch"
                                  value={templateName}
                                  onChange={(e) => setTemplateName(e.target.value)}
                                  data-testid="input-template-name"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="tplNiche">Niche (optional)</Label>
                                <Input
                                  id="tplNiche"
                                  placeholder="e.g. Mobile / SaaS / E-commerce"
                                  value={templateNiche}
                                  onChange={(e) => setTemplateNiche(e.target.value)}
                                  data-testid="input-template-niche"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="ghost" onClick={() => setShowSaveTemplate(false)}>
                                Cancel
                              </Button>
                              <Button
                                onClick={handleSaveTemplate}
                                disabled={createTemplate.isPending || !templateName.trim()}
                                data-testid="btn-confirm-save-template"
                              >
                                {createTemplate.isPending ? (
                                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                                ) : (
                                  <><Save className="h-4 w-4 mr-2" /> Save template</>
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button
                          size="sm"
                          onClick={handleSave}
                          disabled={!content || saveMut.isPending}
                          className="ml-auto"
                          data-testid="btn-save-proposal"
                        >
                          {saveMut.isPending ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                          ) : (
                            <><Save className="h-4 w-4 mr-2" /> Save proposal</>
                          )}
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
