import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MessagesSquare, Lightbulb } from "lucide-react";
import { aiPost } from "@/lib/aiFetch";

type Result = { sections: { category: string; questions: string[] }[]; closingTips: string[] };

export default function DiscoveryQuestions() {
  const [projectType, setProjectType] = useState("");
  const [clientIndustry, setClientIndustry] = useState("");
  const [budget, setBudget] = useState("");

  const gen = useMutation({ mutationFn: () => aiPost<Result>("/ai/discovery-questions", { projectType, clientIndustry, budget }) });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><MessagesSquare className="h-8 w-8 text-primary" /> Discovery Call Questions</h1>
        <p className="text-muted-foreground">Sharp questions that uncover budget, urgency, and decision-making — without sounding rehearsed.</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2"><Label>Project type *</Label><Input value={projectType} onChange={(e) => setProjectType(e.target.value)} placeholder="Website redesign" /></div>
            <div className="space-y-2"><Label>Client industry</Label><Input value={clientIndustry} onChange={(e) => setClientIndustry(e.target.value)} placeholder="B2B SaaS" /></div>
            <div className="space-y-2"><Label>Mentioned budget</Label><Input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="$10-15k" /></div>
          </div>
          <Button onClick={() => gen.mutate()} disabled={gen.isPending || !projectType.trim()} size="lg">
            {gen.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Thinking...</> : "Generate Questions"}
          </Button>
          {gen.error && <p className="text-sm text-destructive">{(gen.error as Error).message}</p>}
        </CardContent>
      </Card>

      {gen.data && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {gen.data.sections.map((s) => (
              <Card key={s.category}>
                <CardHeader className="pb-3"><CardTitle className="text-base">{s.category}</CardTitle></CardHeader>
                <CardContent>
                  <ol className="space-y-2 text-sm list-decimal pl-5">
                    {s.questions.map((q, i) => <li key={i}>{q}</li>)}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-5 w-5 text-primary" /> Closing tips</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm list-disc pl-5">
                {gen.data.closingTips.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
