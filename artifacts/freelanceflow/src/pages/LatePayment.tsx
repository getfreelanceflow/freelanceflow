import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlarmClock, Copy, Lightbulb } from "lucide-react";
import { aiPost } from "@/lib/aiFetch";

type Stage = { stage: string; subject: string; body: string };
type Result = {
  currentEmail: { subject: string; body: string };
  escalationLadder: Stage[];
  tips: string[];
};

export default function LatePayment() {
  const [clientName, setClientName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [daysOverdue, setDaysOverdue] = useState(7);
  const [previousRelationship, setPreviousRelationship] = useState("");

  const gen = useMutation({
    mutationFn: () => aiPost<Result>("/ai/late-payment", { clientName, invoiceNumber, amount, daysOverdue, previousRelationship }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><AlarmClock className="h-8 w-8 text-primary" /> Late Payment Chaser</h1>
        <p className="text-muted-foreground">Professional escalation emails that get you paid without burning the relationship.</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Client name *</Label><Input value={clientName} onChange={(e) => setClientName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Days overdue *</Label><Input type="number" value={daysOverdue} onChange={(e) => setDaysOverdue(parseInt(e.target.value) || 0)} /></div>
            <div className="space-y-2"><Label>Invoice number</Label><Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} /></div>
            <div className="space-y-2"><Label>Amount</Label><Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="$5,000" /></div>
          </div>
          <div className="space-y-2"><Label>History with this client</Label><Textarea rows={2} value={previousRelationship} onChange={(e) => setPreviousRelationship(e.target.value)} placeholder="3-year retainer, always paid on time until now..." /></div>
          <Button onClick={() => gen.mutate()} disabled={gen.isPending || !clientName.trim()} size="lg">
            {gen.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Writing...</> : "Draft Reminders"}
          </Button>
          {gen.error && <p className="text-sm text-destructive">{(gen.error as Error).message}</p>}
        </CardContent>
      </Card>

      {gen.data && (
        <>
          <Card className="border-primary/30">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Send now — {daysOverdue} days overdue</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(`Subject: ${gen.data!.currentEmail.subject}\n\n${gen.data!.currentEmail.body}`)}>
                <Copy className="h-4 w-4 mr-1" /> Copy
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm"><span className="font-medium">Subject:</span> {gen.data.currentEmail.subject}</p>
              <pre className="whitespace-pre-wrap text-sm font-sans">{gen.data.currentEmail.body}</pre>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-lg font-semibold mb-3">Full escalation ladder</h2>
            <div className="space-y-3">
              {gen.data.escalationLadder.map((s, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-sm">{s.stage}</CardTitle>
                    <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(`Subject: ${s.subject}\n\n${s.body}`)}>
                      <Copy className="h-4 w-4 mr-1" /> Copy
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm"><span className="font-medium">Subject:</span> {s.subject}</p>
                    <pre className="whitespace-pre-wrap text-sm font-sans">{s.body}</pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-5 w-5 text-primary" /> Tips</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm list-disc pl-5">{gen.data.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
