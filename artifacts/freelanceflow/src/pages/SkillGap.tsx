import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, BookOpen, TrendingUp } from "lucide-react";

const priorityColor: Record<string, string> = {
  high: "bg-red-500/10 text-red-500",
  medium: "bg-yellow-500/10 text-yellow-500",
  low: "bg-blue-500/10 text-blue-500",
};

export default function SkillGap() {
  const [currentSkills, setCurrentSkills] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");

  const gen = useMutation({
    mutationFn: () =>
      api.skillGap({
        currentSkills, targetRole,
        yearsExperience: yearsExperience ? parseFloat(yearsExperience) : undefined,
      }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Skill Gap Analyzer</h1>
        <p className="text-muted-foreground">See what you need to learn to land your dream role.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Your Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Your current skills *</Label>
            <Textarea rows={3} value={currentSkills} onChange={(e) => setCurrentSkills(e.target.value)} placeholder="React, TypeScript, Node.js, Postgres..." />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Target role *</Label>
              <Input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="Senior Full-Stack Engineer" />
            </div>
            <div className="space-y-2">
              <Label>Years experience</Label>
              <Input type="number" step="0.5" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} />
            </div>
          </div>
          <Button onClick={() => gen.mutate()} disabled={gen.isPending || !currentSkills || !targetRole} size="lg">
            {gen.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : <><BookOpen className="mr-2 h-4 w-4" /> Analyze Gap</>}
          </Button>
        </CardContent>
      </Card>

      {gen.data && (
        <>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Readiness</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="text-5xl font-bold text-primary">{gen.data.readiness}</div>
                <div className="text-sm text-muted-foreground pb-2">/ 100</div>
              </div>
              <Progress value={gen.data.readiness} />
              <p className="text-sm">{gen.data.verdict}</p>
              {gen.data.rateProjection && (
                <Badge variant="secondary">Rate projection: {gen.data.rateProjection}</Badge>
              )}
            </CardContent>
          </Card>

          {gen.data.missingSkills.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Skills to Learn</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {gen.data.missingSkills.map((s, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{s.skill}</span>
                      <Badge className={priorityColor[s.priority] ?? ""}>{s.priority} priority</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{s.why}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {gen.data.recommendedSteps.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Recommended Steps</CardTitle></CardHeader>
              <CardContent>
                <ol className="space-y-2 list-decimal list-inside text-sm">
                  {gen.data.recommendedSteps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
