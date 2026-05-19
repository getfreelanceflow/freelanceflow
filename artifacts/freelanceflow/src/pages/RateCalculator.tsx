import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Calculator, Sparkles, Lightbulb } from "lucide-react";

export default function RateCalculator() {
  const { toast } = useToast();
  const [role, setRole] = useState("");
  const [years, setYears] = useState("3");
  const [skills, setSkills] = useState("");
  const [location, setLocation] = useState("");
  const [targetIncome, setTargetIncome] = useState("");
  const [billable, setBillable] = useState("25");

  const calc = useMutation({
    mutationFn: () =>
      api.calculateRate({
        role,
        yearsExperience: parseFloat(years),
        skills,
        location: location || undefined,
        targetIncome: targetIncome ? parseFloat(targetIncome) : undefined,
        billableHoursPerWeek: parseFloat(billable),
      }),
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const result = calc.data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rate Calculator</h1>
        <p className="text-muted-foreground mt-2">
          Get an AI-recommended hourly rate based on your role, experience, and goals.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              placeholder="Role (e.g., React developer)"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
            <Input
              placeholder="Years of experience"
              type="number"
              value={years}
              onChange={(e) => setYears(e.target.value)}
            />
            <Input
              placeholder="Skills (comma separated)"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />
            <Input
              placeholder="Location (optional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <Input
              placeholder="Target annual income (optional)"
              type="number"
              value={targetIncome}
              onChange={(e) => setTargetIncome(e.target.value)}
            />
            <Input
              placeholder="Billable hours/week"
              type="number"
              value={billable}
              onChange={(e) => setBillable(e.target.value)}
            />
          </div>
          <Button
            onClick={() => calc.mutate()}
            disabled={!role || !skills || calc.isPending}
            className="w-full md:w-auto"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {calc.isPending ? "Calculating..." : "Calculate My Rate"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Conservative", value: result.low, hint: "Easy wins" },
              { label: "Recommended", value: result.recommended, hint: "Sweet spot" },
              { label: "Premium", value: result.high, hint: "Top tier" },
            ].map((t, i) => (
              <Card
                key={t.label}
                className={i === 1 ? "border-primary bg-primary/5" : ""}
              >
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">{t.label}</p>
                  <p className="text-4xl font-bold mt-2 text-primary">${t.value}<span className="text-base text-muted-foreground">/hr</span></p>
                  <p className="text-xs text-muted-foreground mt-1">{t.hint}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {result.incomeBased != null && (
            <Card className="bg-card/60">
              <CardContent className="p-5 flex items-center gap-3">
                <Calculator className="h-5 w-5 text-primary" />
                <p>
                  To hit your target income, you'd need to bill at least{" "}
                  <span className="text-primary font-semibold">${result.incomeBased}/hr</span> at{" "}
                  {billable} billable hours per week.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Why this range</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{result.rationale}</p>
              {result.tips.length > 0 && (
                <ul className="space-y-2">
                  {result.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
