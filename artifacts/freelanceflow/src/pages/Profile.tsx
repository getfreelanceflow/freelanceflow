import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type PortfolioItem } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Plus, X, Save, Link as LinkIcon, Copy, ExternalLink } from "lucide-react";

export default function Profile() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery({ queryKey: ["profile"], queryFn: api.getProfile });
  const profile = data;

  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [location, setLocation] = useState("");
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);

  // AI bio generator state
  const [bioRole, setBioRole] = useState("");
  const [bioTone, setBioTone] = useState("");
  const [bioPlatform, setBioPlatform] = useState<"upwork" | "fiverr" | "linkedin" | "general">(
    "general"
  );

  useEffect(() => {
    if (data) {
      setDisplayName(data.displayName);
      setHeadline(data.headline);
      setBio(data.bio);
      setSkillsText(data.skills.join(", "));
      setHourlyRate(data.hourlyRate?.toString() ?? "");
      setYearsExperience(data.yearsExperience?.toString() ?? "");
      setLocation(data.location ?? "");
      setPortfolio(data.portfolioItems);
      setBioRole(data.headline);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      api.updateProfile({
        displayName,
        headline,
        bio,
        skills: skillsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        yearsExperience: yearsExperience ? parseInt(yearsExperience) : null,
        location: location || null,
        portfolioItems: portfolio,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Profile saved" });
    },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const generateBio = useMutation({
    mutationFn: () =>
      api.generateBio({
        name: displayName,
        role: bioRole || headline || "Freelancer",
        skills: skillsText || "general freelance skills",
        experience: yearsExperience ? `${yearsExperience} years` : undefined,
        tone: bioTone || undefined,
        platform: bioPlatform,
      }),
    onSuccess: (res) => {
      setBio(res.bio);
      toast({ title: "Bio generated" });
    },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile & Portfolio</h1>
          <p className="text-muted-foreground mt-2">
            Your freelance identity — also powers your public portfolio page.
          </p>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {save.isPending ? "Saving..." : "Save Profile"}
        </Button>
      </div>

      {profile?.publicSlug && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 font-medium">
              <LinkIcon className="h-4 w-4 text-primary" />
              Your public profile page
            </div>
            <p className="text-sm text-muted-foreground">
              Share this single link to showcase your bio and all your public service packages.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <code className="text-sm bg-background border rounded px-3 py-1.5 flex-1 min-w-0 truncate">
                {window.location.origin}/u/{profile.publicSlug}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/u/${profile.publicSlug}`);
                  toast({ title: "Copied to clipboard" });
                }}
              >
                <Copy className="h-4 w-4 mr-1.5" /> Copy
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(`/u/${profile.publicSlug}`, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-1.5" /> View
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Input
              placeholder="Headline (e.g., Full-stack Developer)"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
            <Input
              placeholder="Hourly rate"
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
            />
            <Input
              placeholder="Years experience"
              type="number"
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
            />
            <Input
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <Input
              placeholder="Skills (comma separated)"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI Bio Writer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Role / specialty"
              value={bioRole}
              onChange={(e) => setBioRole(e.target.value)}
            />
            <Input
              placeholder="Tone (optional)"
              value={bioTone}
              onChange={(e) => setBioTone(e.target.value)}
            />
            <Select
              value={bioPlatform}
              onValueChange={(v) => setBioPlatform(v as typeof bioPlatform)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="upwork">Upwork</SelectItem>
                <SelectItem value="fiverr">Fiverr</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => generateBio.mutate()} disabled={generateBio.isPending}>
            <Sparkles className="mr-2 h-4 w-4" />
            {generateBio.isPending ? "Generating..." : "Generate Bio"}
          </Button>
          <Textarea
            rows={8}
            placeholder="Your bio will appear here — or write your own."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Portfolio</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPortfolio([...portfolio, { title: "", description: "", url: "" }])
              }
            >
              <Plus className="mr-2 h-4 w-4" /> Add Project
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {portfolio.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No portfolio items yet. Add projects to showcase your work.
            </p>
          )}
          {portfolio.map((item, idx) => (
            <div key={idx} className="border border-border rounded-lg p-4 space-y-2 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => setPortfolio(portfolio.filter((_, i) => i !== idx))}
              >
                <X className="h-4 w-4" />
              </Button>
              <Input
                placeholder="Project title"
                value={item.title}
                onChange={(e) => {
                  const next = [...portfolio];
                  next[idx] = { ...item, title: e.target.value };
                  setPortfolio(next);
                }}
              />
              <Textarea
                placeholder="Description"
                value={item.description}
                onChange={(e) => {
                  const next = [...portfolio];
                  next[idx] = { ...item, description: e.target.value };
                  setPortfolio(next);
                }}
              />
              <Input
                placeholder="URL (optional)"
                value={item.url ?? ""}
                onChange={(e) => {
                  const next = [...portfolio];
                  next[idx] = { ...item, url: e.target.value };
                  setPortfolio(next);
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
