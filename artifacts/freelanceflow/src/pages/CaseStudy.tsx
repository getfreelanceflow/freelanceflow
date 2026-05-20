import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpenCheck, Copy } from "lucide-react";
import { aiPost } from "@/lib/aiFetch";

type Result = {
  headline: string;
  subheadline: string;
  tldr: string;
  challenge: string;
  approach: string;
  results: string;
  resultsBullets: string[];
  testimonialPrompt: string;
  skillsHighlighted: string[];
};

export default function CaseStudy() {
  const [projectName, setProjectName] = useState("");
  const [client, setClient] = useState("");
  const [challenge, setChallenge] = useState("");
  const [solution, setSolution] = useState("");
  const [results, setResults] = useState("");
  const [skills, setSkills] = useState("");

  const gen = useMutation({
    mutationFn: () => aiPost<Result>("/ai/case-study", { projectName, client, challenge, solution, results, skills }),
  });

  const fullCopy = (r: Result) =>
    `${r.headline}\n${r.subheadline}\n\nTL;DR\n${r.tldr}\n\nChallenge\n${r.challenge}\n\nApproach\n${r.approach}\n\nResults\n${r.results}\n\n${r.resultsBullets.map((b) => `• ${b}`).join("\n")}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><BookOpenCheck className="h-8 w-8 text-primary" /> Case Study Generator</h1>
        <p className="text-muted-foreground">Turn any project into a portfolio case study that wins clients.</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Project name *</Label><Input value={projectName} onChange={(e) => setProjectName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Client</Label><Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Or 'Anonymous fintech startup'" /></div>
          </div>
          <div className="space-y-2"><Label>Challenge *</Label><Textarea rows={3} value={challenge} onChange={(e) => setChallenge(e.target.value)} placeholder="What problem were they facing?" /></div>
          <div className="space-y-2"><Label>What you did *</Label><Textarea rows={3} value={solution} onChange={(e) => setSolution(e.target.value)} /></div>
          <div className="space-y-2"><Label>Results *</Label><Textarea rows={3} value={results} onChange={(e) => setResults(e.target.value)} placeholder="40% conversion lift, $200k extra ARR, etc." /></div>
          <div className="space-y-2"><Label>Skills used</Label><Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="UX, Figma, React, A/B testing" /></div>
          <Button onClick={() => gen.mutate()} disabled={gen.isPending || !projectName.trim() || challenge.length < 3 || solution.length < 3 || results.length < 3} size="lg">
            {gen.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Writing...</> : "Generate Case Study"}
          </Button>
          {gen.error && <p className="text-sm text-destructive">{(gen.error as Error).message}</p>}
        </CardContent>
      </Card>

      {gen.data && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{gen.data.headline}</CardTitle>
              <p className="text-muted-foreground mt-1">{gen.data.subheadline}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(fullCopy(gen.data!))}>
              <Copy className="h-4 w-4 mr-1" /> Copy all
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-md bg-primary/5 border-l-4 border-primary p-4"><p className="text-sm font-medium mb-1">TL;DR</p><p className="text-sm">{gen.data.tldr}</p></div>
            <Section title="Challenge" body={gen.data.challenge} />
            <Section title="Approach" body={gen.data.approach} />
            <div>
              <h3 className="font-semibold mb-2">Results</h3>
              <p className="text-sm text-muted-foreground mb-3">{gen.data.results}</p>
              <ul className="space-y-1 text-sm list-disc pl-5">{gen.data.resultsBullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Suggested testimonial to request</p>
              <p className="text-sm italic">"{gen.data.testimonialPrompt}"</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {gen.data.skillsHighlighted.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{body}</p>
    </div>
  );
}
