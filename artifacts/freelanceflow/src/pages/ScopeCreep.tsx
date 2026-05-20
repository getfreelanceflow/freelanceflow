import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, AlertTriangle, Copy } from "lucide-react";
import { aiPost } from "@/lib/aiFetch";

type Result = {
  scopeCreepDetected: boolean;
  severity: "none" | "minor" | "moderate" | "major";
  additions: string[];
  estimatedExtraHours: number;
  estimatedExtraCost: string;
  recommendation: string;
  responseTemplate: string;
};

const sevColor: Record<string, string> = {
  none: "bg-green-500/10 text-green-500",
  minor: "bg-yellow-500/10 text-yellow-600",
  moderate: "bg-orange-500/10 text-orange-500",
  major: "bg-destructive/10 text-destructive",
};

export default function ScopeCreep() {
  const [originalScope, setOriginalScope] = useState("");
  const [clientMessage, setClientMessage] = useState("");

  const gen = useMutation({ mutationFn: () => aiPost<Result>("/ai/scope-creep", { originalScope, clientMessage }) });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Shield className="h-8 w-8 text-primary" /> Scope Creep Detector</h1>
        <p className="text-muted-foreground">Paste the original scope and the new client message. We'll flag the creep and draft your response.</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2"><Label>Original project scope *</Label><Textarea rows={4} value={originalScope} onChange={(e) => setOriginalScope(e.target.value)} placeholder="5-page marketing website, brand colors, contact form..." /></div>
          <div className="space-y-2"><Label>New client message *</Label><Textarea rows={5} value={clientMessage} onChange={(e) => setClientMessage(e.target.value)} placeholder="Hey, can you also add a blog, multi-language support, and integrate our CRM..." /></div>
          <Button onClick={() => gen.mutate()} disabled={gen.isPending || originalScope.length < 3 || clientMessage.length < 3} size="lg">
            {gen.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : "Analyze"}
          </Button>
          {gen.error && <p className="text-sm text-destructive">{(gen.error as Error).message}</p>}
        </CardContent>
      </Card>

      {gen.data && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2">
                  {gen.data.scopeCreepDetected ? <AlertTriangle className="h-5 w-5 text-orange-500" /> : <Shield className="h-5 w-5 text-green-500" />}
                  {gen.data.scopeCreepDetected ? "Scope creep detected" : "Looks in-scope"}
                </CardTitle>
                <Badge className={sevColor[gen.data.severity]}>Severity: {gen.data.severity}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {gen.data.additions?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">New items not in original scope:</p>
                  <ul className="text-sm list-disc pl-5 space-y-1 text-muted-foreground">
                    {gen.data.additions.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Estimated extra hours</p><p className="text-2xl font-bold">{gen.data.estimatedExtraHours}</p></div>
                <div className="rounded-md bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Estimated extra cost</p><p className="text-2xl font-bold">{gen.data.estimatedExtraCost}</p></div>
              </div>
              <div className="rounded-md border-l-4 border-primary bg-primary/5 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-primary mb-1">Recommendation</p>
                <p className="text-sm">{gen.data.recommendation}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Draft response</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(gen.data!.responseTemplate)}>
                <Copy className="h-4 w-4 mr-1" /> Copy
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm font-sans">{gen.data.responseTemplate}</pre>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
