import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Goal } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Target, Pencil } from "lucide-react";

export default function Goals() {
  const qc = useQueryClient();
  const { data: goals = [], isLoading } = useQuery({ queryKey: ["goals"], queryFn: api.listGoals });

  const [title, setTitle] = useState("");
  const [type, setType] = useState<Goal["type"]>("earnings");
  const [target, setTarget] = useState("");
  const [period, setPeriod] = useState<Goal["period"]>("month");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["goals"] });
  const create = useMutation({ mutationFn: api.createGoal, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<Goal> }) => api.updateGoal(id, body),
    onSuccess: invalidate,
  });
  const del = useMutation({ mutationFn: api.deleteGoal, onSuccess: invalidate });

  function add() {
    if (!title.trim() || !target) return;
    create.mutate({
      title,
      type,
      target: target as unknown as string,
      period,
      startDate: new Date().toISOString(),
    } as unknown as Partial<Goal>);
    setTitle("");
    setTarget("");
  }

  function updateProgress(g: Goal, newValue: string) {
    update.mutate({ id: g.id, body: { currentValue: newValue as unknown as string } });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Goals</h1>
        <p className="text-muted-foreground">Set targets and track your progress.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>New Goal</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[1fr_180px_180px_180px_auto]">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Hit $10k this quarter" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as Goal["type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="earnings">Earnings ($)</SelectItem>
                  <SelectItem value="proposals">Proposals</SelectItem>
                  <SelectItem value="clients">Clients</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target</Label>
              <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Period</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as Goal["period"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This week</SelectItem>
                  <SelectItem value="month">This month</SelectItem>
                  <SelectItem value="quarter">This quarter</SelectItem>
                  <SelectItem value="year">This year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={add} disabled={!title.trim() || !target}>
                <Plus className="mr-2 h-4 w-4" /> Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading
          ? [1, 2].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-3 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))
          : null}
        {!isLoading && goals.map((g) => {
          const current = parseFloat(g.currentValue);
          const tgt = parseFloat(g.target);
          const pct = tgt > 0 ? Math.min(100, (current / tgt) * 100) : 0;
          return (
            <Card key={g.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{g.title}</CardTitle>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(g.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="capitalize">{g.type}</Badge>
                  <Badge variant="secondary" className="capitalize">{g.period}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>{g.type === "earnings" ? `$${current.toFixed(0)}` : current} / {g.type === "earnings" ? `$${tgt.toFixed(0)}` : tgt}</span>
                  <span className="font-medium">{pct.toFixed(0)}%</span>
                </div>
                <Progress value={pct} />
                <div className="flex items-center gap-2">
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="Update current value"
                    defaultValue={g.currentValue}
                    onBlur={(e) => {
                      if (e.target.value !== g.currentValue) updateProgress(g, e.target.value);
                    }}
                    className="h-8 text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!isLoading && goals.length === 0 && (
          <div className="col-span-2 py-12 text-center border rounded-lg bg-card/40">
            <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="text-base font-medium">No goals yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Set a target above to start tracking your progress.</p>
          </div>
        )}
      </div>
    </div>
  );
}
