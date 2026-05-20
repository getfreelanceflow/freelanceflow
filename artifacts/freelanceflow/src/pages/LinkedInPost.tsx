import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Linkedin, Copy } from "lucide-react";
import { aiPost } from "@/lib/aiFetch";

type Post = { style: string; hook: string; body: string; hashtags: string[] };
type Result = { posts: Post[]; hookAlternatives: string[] };

export default function LinkedInPost() {
  const [topic, setTopic] = useState("");
  const [angle, setAngle] = useState("");
  const [myRole, setMyRole] = useState("");
  const [cta, setCta] = useState("");

  const gen = useMutation({ mutationFn: () => aiPost<Result>("/ai/linkedin-post", { topic, angle, myRole, cta }) });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Linkedin className="h-8 w-8 text-primary" /> LinkedIn Post Generator</h1>
        <p className="text-muted-foreground">Scroll-stopping posts that build your personal brand and bring inbound work.</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2"><Label>Topic *</Label><Textarea rows={2} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Why most landing pages fail to convert..." /></div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2"><Label>Angle</Label><Input value={angle} onChange={(e) => setAngle(e.target.value)} placeholder="Contrarian, story-led..." /></div>
            <div className="space-y-2"><Label>Your role</Label><Input value={myRole} onChange={(e) => setMyRole(e.target.value)} placeholder="Conversion designer" /></div>
            <div className="space-y-2"><Label>Call to action</Label><Input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="DM me 'audit'" /></div>
          </div>
          <Button onClick={() => gen.mutate()} disabled={gen.isPending || topic.length < 3} size="lg">
            {gen.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Writing...</> : "Generate Posts"}
          </Button>
          {gen.error && <p className="text-sm text-destructive">{(gen.error as Error).message}</p>}
        </CardContent>
      </Card>

      {gen.data && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {gen.data.posts.map((p, i) => (
              <Card key={i} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{p.style}</CardTitle>
                    <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(`${p.hook}\n\n${p.body}\n\n${p.hashtags.map((h) => `#${h}`).join(" ")}`)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <p className="font-semibold text-sm">{p.hook}</p>
                  <pre className="whitespace-pre-wrap text-sm font-sans text-muted-foreground">{p.body}</pre>
                  <div className="flex flex-wrap gap-1 pt-2 border-t">
                    {p.hashtags.map((h) => <Badge key={h} variant="secondary" className="text-xs">#{h}</Badge>)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {gen.data.hookAlternatives?.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Hook alternatives</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm list-disc pl-5">{gen.data.hookAlternatives.map((h, i) => <li key={i}>{h}</li>)}</ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
