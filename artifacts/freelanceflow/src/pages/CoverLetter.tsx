import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Copy, Mail } from "lucide-react";

export default function CoverLetter() {
  const { toast } = useToast();
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [mySkills, setMySkills] = useState("");
  const [myName, setMyName] = useState("");
  const [tone, setTone] = useState("");
  const [letter, setLetter] = useState("");

  const generate = useMutation({
    mutationFn: () =>
      api.generateCoverLetter({
        jobTitle,
        jobDescription,
        mySkills,
        myName: myName || undefined,
        tone: tone || undefined,
      }),
    onSuccess: (res) => setLetter(res.coverLetter),
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const copy = () => {
    navigator.clipboard.writeText(letter);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cover Letter Generator</h1>
        <p className="text-muted-foreground mt-2">
          Generate personalized cover letters tailored to each job posting.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Job title *"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
          />
          <Textarea
            placeholder="Paste the job description *"
            rows={5}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
          <Input
            placeholder="Your relevant skills/experience *"
            value={mySkills}
            onChange={(e) => setMySkills(e.target.value)}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              placeholder="Your name (optional)"
              value={myName}
              onChange={(e) => setMyName(e.target.value)}
            />
            <Input
              placeholder="Tone (e.g., confident, friendly)"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            />
          </div>
          <Button
            onClick={() => generate.mutate()}
            disabled={!jobTitle || !jobDescription || !mySkills || generate.isPending}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {generate.isPending ? "Writing..." : "Generate Cover Letter"}
          </Button>
        </CardContent>
      </Card>

      {letter && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Your Cover Letter
              </span>
              <Button variant="outline" size="sm" onClick={copy}>
                <Copy className="mr-2 h-4 w-4" /> Copy
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={14}
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              className="font-serif text-base leading-relaxed"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
