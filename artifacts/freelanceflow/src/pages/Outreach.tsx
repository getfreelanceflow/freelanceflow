import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, Copy, Mail } from "lucide-react";
import { aiPost } from "@/lib/aiFetch";

type OutreachResult = { subject: string; email: string; followUp1: string; followUp2: string };

export default function Outreach() {
  const [targetCompany, setTargetCompany] = useState("");
  const [targetPerson, setTargetPerson] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [myOffer, setMyOffer] = useState("");
  const [valueProp, setValueProp] = useState("");
  const [tone, setTone] = useState("");

  const gen = useMutation({
    mutationFn: () =>
      aiPost<OutreachResult>("/ai/outreach", { targetCompany, targetPerson, targetRole, myOffer, valueProp, tone }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Send className="h-8 w-8 text-primary" /> Cold Outreach Generator</h1>
        <p className="text-muted-foreground">Personalized cold emails + follow-up sequence that get replies.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Who are you reaching out to?</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Target company *</Label><Input value={targetCompany} onChange={(e) => setTargetCompany(e.target.value)} placeholder="Acme Inc." /></div>
            <div className="space-y-2"><Label>Person (optional)</Label><Input value={targetPerson} onChange={(e) => setTargetPerson(e.target.value)} placeholder="Jane Smith" /></div>
            <div className="space-y-2"><Label>Their role</Label><Input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="Head of Marketing" /></div>
            <div className="space-y-2"><Label>Tone</Label><Input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="Direct, warm, confident" /></div>
          </div>
          <div className="space-y-2"><Label>What are you offering? *</Label><Textarea rows={2} value={myOffer} onChange={(e) => setMyOffer(e.target.value)} placeholder="Fractional CMO services, conversion rate optimization..." /></div>
          <div className="space-y-2"><Label>Your differentiator</Label><Textarea rows={2} value={valueProp} onChange={(e) => setValueProp(e.target.value)} placeholder="Helped 12 SaaS companies hit Series A by improving activation..." /></div>
          <Button onClick={() => gen.mutate()} disabled={gen.isPending || !targetCompany.trim() || myOffer.length < 3} size="lg">
            {gen.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Writing...</> : <><Mail className="mr-2 h-4 w-4" /> Generate Outreach</>}
          </Button>
          {gen.error && <p className="text-sm text-destructive">{(gen.error as Error).message}</p>}
        </CardContent>
      </Card>

      {gen.data && (
        <div className="space-y-4">
          <EmailCard title="First Email" subject={gen.data.subject} body={gen.data.email} />
          <EmailCard title="Follow-up (day 4)" body={gen.data.followUp1} />
          <EmailCard title="Breakup email (day 10)" body={gen.data.followUp2} />
        </div>
      )}
    </div>
  );
}

function EmailCard({ title, subject, body }: { title: string; subject?: string; body: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(subject ? `Subject: ${subject}\n\n${body}` : body)}>
          <Copy className="h-4 w-4 mr-1" /> Copy
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {subject && <p className="text-sm"><span className="font-medium">Subject:</span> {subject}</p>}
        <pre className="whitespace-pre-wrap text-sm font-sans">{body}</pre>
      </CardContent>
    </Card>
  );
}
