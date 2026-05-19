import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Target, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

export default function ProposalScore() {
  const { toast } = useToast();
  const [proposalContent, setProposalContent] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const score = useMutation({
    mutationFn: () =>
      api.predictSuccess({
        proposalContent,
        jobDescription: jobDescription || undefined,
      }),
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const result = score.data;
  const scoreColor =
    !result ? "" : result.score >= 80 ? "text-green-400" : result.score >= 60 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Proposal Success Predictor</h1>
        <p className="text-muted-foreground mt-2">
          Score a proposal before you send it. Get specific feedback on how to improve.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paste Your Draft</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={4}
            placeholder="Job description (optional but recommended)"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
          <Textarea
            rows={10}
            placeholder="Your proposal draft *"
            value={proposalContent}
            onChange={(e) => setProposalContent(e.target.value)}
          />
          <Button onClick={() => score.mutate()} disabled={!proposalContent || score.isPending}>
            <Sparkles className="mr-2 h-4 w-4" />
            {score.isPending ? "Analyzing..." : "Score My Proposal"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card className="text-center">
            <CardContent className="p-8">
              <Target className="mx-auto h-10 w-10 text-primary mb-4" />
              <p className={`text-6xl font-bold ${scoreColor}`}>{result.score}<span className="text-3xl text-muted-foreground">/100</span></p>
              <p className="text-lg mt-3">{result.verdict}</p>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="h-5 w-5" /> What's Working
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.strengths.length > 0 ? (
                  <ul className="space-y-2">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No strengths detected.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-400">
                  <AlertCircle className="h-5 w-5" /> How to Improve
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.improvements.length > 0 ? (
                  <ul className="space-y-2">
                    {result.improvements.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No improvements suggested.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
