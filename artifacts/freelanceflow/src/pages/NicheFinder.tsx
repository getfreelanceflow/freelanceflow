import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Target, Copy } from "lucide-react";
import { aiPost } from "@/lib/aiFetch";

type Niche = {
  name: string;
  tagline: string;
  whyItFits: string;
  marketDemand: string;
  competition: string;
  avgProjectSize: string;
  idealClients: string[];
  firstFiveActions: string[];
};
type Result = { niches: Niche[]; positioning: string };

const demandColor: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-500/10 text-blue-500",
  high: "bg-green-500/10 text-green-500",
  "very high": "bg-primary/15 text-primary",
};

export default function NicheFinder() {
  const [skills, setSkills] = useState("");
  const [pastWork, setPastWork] = useState("");
  const [interests, setInterests] = useState("");
  const [income, setIncome] = useState("");

  const gen = useMutation({ mutationFn: () => aiPost<Result>("/ai/niche-finder", { skills, pastWork, interests, income }) });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Target className="h-8 w-8 text-primary" /> Niche Finder</h1>
        <p className="text-muted-foreground">Find the most profitable, defensible niche at the intersection of your skills, interests, and market demand.</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2"><Label>Your skills *</Label><Textarea rows={2} value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Brand design, Webflow, Framer, motion..." /></div>
          <div className="space-y-2"><Label>Past projects you've enjoyed</Label><Textarea rows={2} value={pastWork} onChange={(e) => setPastWork(e.target.value)} /></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Interests / industries</Label><Input value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="AI, climate, fintech..." /></div>
            <div className="space-y-2"><Label>Income goal</Label><Input value={income} onChange={(e) => setIncome(e.target.value)} placeholder="$200k/year" /></div>
          </div>
          <Button onClick={() => gen.mutate()} disabled={gen.isPending || skills.length < 3} size="lg">
            {gen.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Researching...</> : "Find My Niches"}
          </Button>
          {gen.error && <p className="text-sm text-destructive">{(gen.error as Error).message}</p>}
        </CardContent>
      </Card>

      {gen.data && (
        <>
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Your positioning</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(gen.data!.positioning)}>
                <Copy className="h-4 w-4 mr-1" /> Copy
              </Button>
            </CardHeader>
            <CardContent><p className="text-sm">{gen.data.positioning}</p></CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {gen.data.niches.map((n, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{n.name}</CardTitle>
                      <p className="text-xs text-muted-foreground italic mt-1">{n.tagline}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{n.whyItFits}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge className={demandColor[n.marketDemand] ?? "bg-muted"}>Demand: {n.marketDemand}</Badge>
                    <Badge variant="outline">Competition: {n.competition}</Badge>
                    <Badge variant="secondary">{n.avgProjectSize}</Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1">Ideal clients</p>
                    <div className="flex flex-wrap gap-1">{n.idealClients.map((c) => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}</div>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1">First 5 actions</p>
                    <ol className="text-xs list-decimal pl-4 space-y-1 text-muted-foreground">
                      {n.firstFiveActions.map((a, j) => <li key={j}>{a}</li>)}
                    </ol>
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
