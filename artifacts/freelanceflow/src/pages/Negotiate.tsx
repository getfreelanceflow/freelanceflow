import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CreditCostBadge from "@/components/CreditCostBadge";
import { Loader2, MessageSquare, Copy } from "lucide-react";

export default function Negotiate() {
  const [situation, setSituation] = useState("");
  const [clientPosition, setClientPosition] = useState("");
  const [myDesiredOutcome, setMyDesiredOutcome] = useState("");
  const [tone, setTone] = useState("");

  const gen = useMutation({
    mutationFn: () =>
      api.negotiate({
        situation, myDesiredOutcome,
        clientPosition: clientPosition || undefined,
        tone: tone || undefined,
      }),
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Negotiation Helper</h1>
          <CreditCostBadge action="negotiate" />
        </div>
        <p className="text-muted-foreground">Get a polished reply for tricky client conversations.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>The Situation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>What's happening? *</Label>
            <Textarea rows={3} value={situation} onChange={(e) => setSituation(e.target.value)} placeholder="Client wants a 30% discount after I quoted them..." />
          </div>
          <div className="space-y-2">
            <Label>Client's position</Label>
            <Textarea rows={2} value={clientPosition} onChange={(e) => setClientPosition(e.target.value)} placeholder="They say their budget is fixed at $3k" />
          </div>
          <div className="space-y-2">
            <Label>Your desired outcome *</Label>
            <Textarea rows={2} value={myDesiredOutcome} onChange={(e) => setMyDesiredOutcome(e.target.value)} placeholder="Hold at $5k but reduce scope..." />
          </div>
          <div className="space-y-2">
            <Label>Tone</Label>
            <Input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="Confident, respectful, collaborative" />
          </div>
          <Button onClick={() => gen.mutate()} disabled={gen.isPending || !situation || !myDesiredOutcome} size="lg">
            {gen.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Drafting...</> : <><MessageSquare className="mr-2 h-4 w-4" /> Write My Reply</>}
          </Button>
        </CardContent>
      </Card>

      {gen.data && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Suggested Reply</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(gen.data.reply)}>
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm font-sans">{gen.data.reply}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
