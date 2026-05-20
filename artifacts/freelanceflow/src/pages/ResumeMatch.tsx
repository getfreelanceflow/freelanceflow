import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Upload, Briefcase } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

async function extractPdf(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let out = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    out += content.items.map((it) => ("str" in it ? (it as { str: string }).str : "")).join(" ") + "\n";
  }
  return out.trim();
}

async function extractDocx(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const r = await mammoth.extractRawText({ arrayBuffer: buf });
  return r.value.trim();
}

type MatchResult = Awaited<ReturnType<typeof api.resumeMatch>>;

export default function ResumeMatch() {
  const [resumeText, setResumeText] = useState("");
  const [age, setAge] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [pastExperiences, setPastExperiences] = useState("");
  const [desiredRole, setDesiredRole] = useState("");
  const [result, setResult] = useState<MatchResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  const matchMutation = useMutation({
    mutationFn: () =>
      api.resumeMatch({
        resumeText,
        age: age ? parseInt(age, 10) : undefined,
        yearsExperience: yearsExperience ? parseFloat(yearsExperience) : undefined,
        pastExperiences: pastExperiences || undefined,
        desiredRole: desiredRole || undefined,
      }),
    onSuccess: (data) => setResult(data),
  });

  async function onFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    setParsing(true);
    try {
      const name = file.name.toLowerCase();
      let text = "";
      if (name.endsWith(".pdf") || file.type === "application/pdf") {
        text = await extractPdf(file);
      } else if (
        name.endsWith(".docx") ||
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        text = await extractDocx(file);
      } else if (name.endsWith(".doc")) {
        throw new Error("Old .doc format isn't supported. Save as .docx or .pdf and try again.");
      } else {
        text = await file.text();
      }
      if (!text.trim()) {
        throw new Error("Couldn't extract any text from that file. Try a different format or paste the text manually.");
      }
      setResumeText(text);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to read file");
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resume → Job Match</h1>
        <p className="text-muted-foreground">
          Paste or upload your resume, share a bit about yourself, and AI will rank
          the best-fit jobs for you.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Resume</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resumeFile" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload resume (PDF, DOCX, or TXT)
            </Label>
            <Input
              id="resumeFile"
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={onFileUpload}
              disabled={parsing}
            />
            {parsing && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Extracting text…
              </p>
            )}
            {fileError && <p className="text-xs text-destructive">{fileError}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="resumeText">Resume text *</Label>
            <Textarea
              id="resumeText"
              rows={10}
              placeholder="Paste your full resume here — work history, education, skills, projects..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                min="14"
                max="99"
                placeholder="e.g. 28"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearsExperience">Years of experience</Label>
              <Input
                id="yearsExperience"
                type="number"
                min="0"
                step="0.5"
                placeholder="e.g. 5"
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desiredRole">Desired role</Label>
              <Input
                id="desiredRole"
                placeholder="e.g. Senior React Developer"
                value={desiredRole}
                onChange={(e) => setDesiredRole(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pastExperiences">Past experiences (optional)</Label>
            <Textarea
              id="pastExperiences"
              rows={3}
              placeholder="Highlight 2-3 standout past roles, projects, or accomplishments you want emphasized."
              value={pastExperiences}
              onChange={(e) => setPastExperiences(e.target.value)}
            />
          </div>

          <Button
            onClick={() => matchMutation.mutate()}
            disabled={resumeText.trim().length < 20 || matchMutation.isPending}
            size="lg"
            className="w-full md:w-auto"
          >
            {matchMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Matching you to jobs...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Find Matching Jobs
              </>
            )}
          </Button>

          {matchMutation.isError && (
            <p className="text-sm text-destructive">
              {(matchMutation.error as Error).message}
            </p>
          )}
        </CardContent>
      </Card>

      {result?.profile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Your AI Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{result.profile.summary}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="capitalize">
                Seniority: {result.profile.seniority}
              </Badge>
              {result.profile.topSkills.map((s) => (
                <Badge key={s} variant="outline">
                  {s}
                </Badge>
              ))}
            </div>
            {result.profile.strengths.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Strengths</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {result.profile.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {result && result.matches.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">
            Top {result.matches.length} Matching Jobs
          </h2>
          {result.matches.map((m) => (
            <Card key={m.jobId}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      {m.job?.title ?? `Job #${m.jobId}`}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {m.job?.category && <span>{m.job.category}</span>}
                      {m.job?.platform && <span>• {m.job.platform}</span>}
                      {m.job?.budgetMin && m.job?.budgetMax && (
                        <span>
                          • ${m.job.budgetMin}–${m.job.budgetMax}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-3xl font-bold text-primary">
                      {m.score}
                    </div>
                    <div className="text-xs text-muted-foreground">match</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{m.reason}</p>
                {m.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {m.highlights.map((h, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        ✓ {h}
                      </Badge>
                    ))}
                  </div>
                )}
                {m.job?.description && (
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {m.job.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {result && result.matches.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No matching jobs found. Try refining your resume or checking back
            later for new job postings.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
