import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles, Briefcase, DollarSign, Target, Lightbulb } from "lucide-react";

type DreamMatch = {
  title: string;
  company: string;
  description: string;
  skills: string[];
  budgetMin: number;
  budgetMax: number;
  duration: string;
  platform: string;
  matchScore: number;
  whyItMatches: string;
  howToWin: string;
};

type DreamJobResponse = {
  matches: DreamMatch[];
  careerAdvice: string;
  searchKeywords: string[];
};

async function postDreamJob(body: unknown): Promise<DreamJobResponse> {
  const w = window as unknown as { Clerk?: { session?: { getToken: () => Promise<string | null> } } };
  const token = await w.Clerk?.session?.getToken?.();
  const res = await fetch("/api/ai/dream-job", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.error ?? `${res.status} ${res.statusText}`);
  }
  return res.json();
}

export default function DreamJob() {
  const [dreamJob, setDreamJob] = useState("");
  const [whatIWantToDo, setWhatIWantToDo] = useState("");
  const [currentSkills, setCurrentSkills] = useState("");
  const [experience, setExperience] = useState("");
  const [targetRate, setTargetRate] = useState("");
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState(true);

  const gen = useMutation({
    mutationFn: () =>
      postDreamJob({
        dreamJob,
        whatIWantToDo,
        currentSkills: currentSkills || undefined,
        experience: experience || undefined,
        targetRate: targetRate || undefined,
        location: location || undefined,
        remote,
      }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" /> Dream Job Finder
        </h1>
        <p className="text-muted-foreground">Tell us your dream career — we'll surface the freelance gigs that get you there.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Your Dream</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Dream job / target role *</Label>
            <Input
              placeholder="e.g. Lead product designer at a YC startup, AI consultant..."
              value={dreamJob}
              onChange={(e) => setDreamJob(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>What do you want to do day-to-day? *</Label>
            <Textarea
              rows={3}
              placeholder="Design end-to-end product experiences, work directly with founders, ship fast..."
              value={whatIWantToDo}
              onChange={(e) => setWhatIWantToDo(e.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Current skills</Label>
              <Input value={currentSkills} onChange={(e) => setCurrentSkills(e.target.value)} placeholder="Figma, React, user research" />
            </div>
            <div className="space-y-2">
              <Label>Experience</Label>
              <Input value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="5 years in B2B SaaS" />
            </div>
            <div className="space-y-2">
              <Label>Target rate</Label>
              <Input value={targetRate} onChange={(e) => setTargetRate(e.target.value)} placeholder="$120/hr or $8k/mo" />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Berlin / Remote" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={remote} onCheckedChange={(v) => setRemote(!!v)} />
            Open to remote
          </label>
          <Button
            onClick={() => gen.mutate()}
            disabled={gen.isPending || !dreamJob.trim() || !whatIWantToDo.trim()}
            size="lg"
            className="w-full sm:w-auto"
          >
            {gen.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finding your jobs...</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" /> Find My Dream Jobs</>
            )}
          </Button>
          {gen.error && (
            <p className="text-sm text-destructive">{(gen.error as Error).message}</p>
          )}
        </CardContent>
      </Card>

      {gen.data && (
        <>
          {gen.data.careerAdvice && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="h-5 w-5 text-primary" /> Strategic Advice
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{gen.data.careerAdvice}</p>
                {gen.data.searchKeywords?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="text-xs text-muted-foreground mr-1">Search keywords:</span>
                    {gen.data.searchKeywords.map((k) => (
                      <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {gen.data.matches.map((m, i) => (
              <Card key={i} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base">{m.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">{m.company} • {m.platform}</p>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary shrink-0">
                      {m.matchScore}% match
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <p className="text-sm text-muted-foreground">{m.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {m.skills.map((s) => (
                      <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${m.budgetMin.toLocaleString()}–${m.budgetMax.toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{m.duration}</span>
                  </div>
                  <div className="rounded-md bg-muted/40 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium">Why it matches</p>
                        <p className="text-xs text-muted-foreground">{m.whyItMatches}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium">How to win it</p>
                        <p className="text-xs text-muted-foreground">{m.howToWin}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
