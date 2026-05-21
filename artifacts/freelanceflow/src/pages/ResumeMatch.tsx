import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Upload, Briefcase } from "lucide-react";
import { aiPost } from "@/lib/aiFetch";

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File too large (max 10 MB).");
      }
      const fileBase64 = await fileToBase64(file);
      const { text } = await aiPost<{ text: string }>("/parse-resume", {
        fileBase64,
        fileName: file.name,
        mimeType: file.type || undefined,
      });
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
          Upload or paste your resume — AI will rank the best-fit jobs for you.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Resume</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload resume (PDF, DOCX, TXT, or photo)
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={onFileUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={parsing}
              className="w-full md:w-auto"
            >
              {parsing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Extracting text…</>
              ) : (
                <><Upload className="mr-2 h-4 w-4" /> Choose file or photo</>
              )}
            </Button>
            {fileError && <p className="text-xs text-destructive">{fileError}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="resumeText">Resume text *</Label>
            <Textarea
              id="resumeText"
              rows={10}
              placeholder="Or paste your resume text here — work history, education, skills, projects..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input id="age" type="number" min="14" max="99" placeholder="e.g. 28" value={age} onChange={(e) => setAge(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearsExperience">Years of experience</Label>
              <Input id="yearsExperience" type="number" min="0" step="0.5" placeholder="e.g. 5" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desiredRole">Desired role</Label>
              <Input id="desiredRole" placeholder="e.g. Senior React Developer" value={desiredRole} onChange={(e) => setDesiredRole(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pastExperiences">Past experiences (optional)</Label>
            <Textarea id="pastExperiences" rows={3} placeholder="Highlight 2-3 standout past roles, projects, or accomplishments." value={pastExperiences} onChange={(e) => setPastExperiences(e.target.value)} />
          </div>

          <Button
            onClick={() => matchMutation.mutate()}
            disabled={resumeText.trim().length < 20 || matchMutation.isPending}
            size="lg"
            className="w-full md:w-auto"
          >
            {matchMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Matching you to jobs...</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" /> Find Matching Jobs</>
            )}
          </Button>

          {matchMutation.isError && (
            <p className="text-sm text-destructive">{(matchMutation.error as Error).message}</p>
          )}
        </CardContent>
      </Card>

      {result?.profile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Your AI Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{result.profile.summary}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="capitalize">Seniority: {result.profile.seniority}</Badge>
              {result.profile.topSkills.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
            </div>
            {result.profile.strengths.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Strengths</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {result.profile.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {result && result.matches.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Top {result.matches.length} Matching Jobs</h2>
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
                        <span>• ${m.job.budgetMin}–${m.job.budgetMax}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-3xl font-bold text-primary">{m.score}</div>
                    <div className="text-xs text-muted-foreground">match</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{m.reason}</p>
                {m.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {m.highlights.map((h, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">✓ {h}</Badge>
                    ))}
                  </div>
                )}
                {m.job?.description && (
                  <p className="text-xs text-muted-foreground line-clamp-3">{m.job.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {result && result.matches.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No matching jobs found. Try refining your resume.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
