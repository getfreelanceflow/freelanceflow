import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Trash2, Clock, DollarSign } from "lucide-react";

export default function TimeTracker() {
  const qc = useQueryClient();
  const { data: entries = [] } = useQuery({ queryKey: ["time-entries"], queryFn: api.listTimeEntries });
  const { data: summary } = useQuery({ queryKey: ["time-summary"], queryFn: api.timeSummary });

  const [description, setDescription] = useState("");
  const [rate, setRate] = useState("");
  const [billable, setBillable] = useState(true);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => {
      setElapsed((Date.now() - new Date(startedAt).getTime()) / 1000);
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const create = useMutation({
    mutationFn: api.createTimeEntry,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time-entries"] });
      qc.invalidateQueries({ queryKey: ["time-summary"] });
    },
  });
  const del = useMutation({
    mutationFn: api.deleteTimeEntry,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time-entries"] });
      qc.invalidateQueries({ queryKey: ["time-summary"] });
    },
  });

  function start() {
    if (!description.trim()) return;
    setStartedAt(new Date().toISOString());
    setElapsed(0);
  }

  function stop() {
    if (!startedAt) return;
    const ended = new Date().toISOString();
    const hours = (Date.now() - new Date(startedAt).getTime()) / 3600000;
    create.mutate({
      description,
      startedAt,
      endedAt: ended,
      hours: hours.toFixed(2) as unknown as string,
      rate: rate ? (parseFloat(rate).toFixed(2) as unknown as string) : null,
      billable,
    } as unknown as Parameters<typeof api.createTimeEntry>[0]);
    setStartedAt(null);
    setDescription("");
    setElapsed(0);
  }

  const hms = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Time Tracker</h1>
        <p className="text-muted-foreground">Track billable hours across projects.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalHours?.toFixed(1) ?? "0.0"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Billable Hours</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.billableHours?.toFixed(1) ?? "0.0"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.entryCount ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{startedAt ? "Running..." : "Start a session"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>What are you working on?</Label>
              <Input
                placeholder="e.g. Acme landing page revisions"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!!startedAt}
              />
            </div>
            <div className="space-y-2">
              <Label>Hourly rate ($)</Label>
              <Input
                type="number"
                placeholder="75"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                disabled={!!startedAt}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="billable-toggle"
              checked={billable}
              onCheckedChange={setBillable}
              disabled={!!startedAt}
            />
            <Label htmlFor="billable-toggle" className="cursor-pointer">
              Billable
            </Label>
          </div>
          <div className="flex items-center gap-4">
            {!startedAt ? (
              <Button onClick={start} disabled={!description.trim()}>
                <Play className="mr-2 h-4 w-4" /> Start Timer
              </Button>
            ) : (
              <Button onClick={stop} variant="destructive">
                <Square className="mr-2 h-4 w-4" /> Stop
              </Button>
            )}
            {startedAt && <div className="text-2xl font-mono">{hms(elapsed)}</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries yet.</p>
          ) : (
            <div className="space-y-2">
              {entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-1">
                    <p className="font-medium">{e.description}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{new Date(e.startedAt).toLocaleString()}</span>
                      <span>• {parseFloat(e.hours).toFixed(2)}h</span>
                      {e.rate && <span>• ${e.rate}/hr</span>}
                      {e.rate && <span>• ${(parseFloat(e.hours) * parseFloat(e.rate)).toFixed(2)}</span>}
                      {e.billable && <Badge variant="outline" className="text-xs">billable</Badge>}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(e.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
