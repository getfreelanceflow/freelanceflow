import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CreditCostBadge from "@/components/CreditCostBadge";
import { Loader2, FileSignature, Copy } from "lucide-react";

export default function Contract() {
  const [clientName, setClientName] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [scope, setScope] = useState("");
  const [fee, setFee] = useState("");
  const [timeline, setTimeline] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [freelancerName, setFreelancerName] = useState("");

  const gen = useMutation({
    mutationFn: () =>
      api.generateContract({
        clientName, projectTitle, scope, fee,
        timeline: timeline || undefined,
        paymentTerms: paymentTerms || undefined,
        freelancerName: freelancerName || undefined,
      }),
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Contract Generator</h1>
          <CreditCostBadge action="contract" />
        </div>
        <p className="text-muted-foreground">Draft a freelance contract in seconds.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Project Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Your name</Label><Input value={freelancerName} onChange={(e) => setFreelancerName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Client name *</Label><Input value={clientName} onChange={(e) => setClientName(e.target.value)} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Project title *</Label><Input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} /></div>
            <div className="space-y-2 md:col-span-2">
              <Label>Scope of work *</Label>
              <Textarea rows={4} value={scope} onChange={(e) => setScope(e.target.value)} placeholder="Deliverables, what's included, what's not..." />
            </div>
            <div className="space-y-2"><Label>Fee *</Label><Input value={fee} onChange={(e) => setFee(e.target.value)} placeholder="$5,000 fixed / $100/hr" /></div>
            <div className="space-y-2"><Label>Timeline</Label><Input value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="6 weeks from kickoff" /></div>
            <div className="space-y-2 md:col-span-2"><Label>Payment terms</Label><Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="50% upfront, 50% on delivery" /></div>
          </div>
          <Button
            onClick={() => gen.mutate()}
            disabled={gen.isPending || !clientName || !projectTitle || !scope || !fee}
            size="lg"
          >
            {gen.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Drafting...</> : <><FileSignature className="mr-2 h-4 w-4" /> Generate Contract</>}
          </Button>
        </CardContent>
      </Card>

      {gen.data && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Draft Contract</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(gen.data.contract)}>
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm font-sans">{gen.data.contract}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
