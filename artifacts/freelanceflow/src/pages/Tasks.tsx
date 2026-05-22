import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Task } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, CheckCircle2, Circle, Loader2 } from "lucide-react";

const priorityColor: Record<string, string> = {
  high: "text-red-500",
  medium: "text-yellow-500",
  low: "text-blue-500",
};

export default function Tasks() {
  const qc = useQueryClient();
  const { data: tasks = [], isLoading } = useQuery({ queryKey: ["tasks"], queryFn: api.listTasks });

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");

  const create = useMutation({
    mutationFn: api.createTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<Task> }) =>
      api.updateTask(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
  const del = useMutation({
    mutationFn: api.deleteTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  function add() {
    if (!title.trim()) return;
    create.mutate({
      title,
      priority,
      status: "todo",
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    } as Partial<Task>);
    setTitle("");
    setDueDate("");
  }

  function cycleStatus(t: Task) {
    const next = t.status === "todo" ? "in_progress" : t.status === "in_progress" ? "done" : "todo";
    update.mutate({ id: t.id, body: { status: next } });
  }

  const groups: Array<{ label: string; status: Task["status"] }> = [
    { label: "To Do", status: "todo" },
    { label: "In Progress", status: "in_progress" },
    { label: "Done", status: "done" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground">Stay on top of your project work.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Task</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[1fr_180px_180px_auto]">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as "low" | "medium" | "high")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={add} disabled={!title.trim()}>
                <Plus className="mr-2 h-4 w-4" /> Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {groups.map((g) => (
          <Card key={g.status}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {g.label} <Badge variant="secondary" className="ml-2">{tasks.filter((t) => t.status === g.status).length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading
                ? [1, 2].map((i) => (
                    <div key={i} className="rounded-lg border p-3 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))
                : null}
              {!isLoading && tasks.filter((t) => t.status === g.status).map((t) => (
                <div key={t.id} className="flex items-start justify-between rounded-lg border p-3 gap-2">
                  <button onClick={() => cycleStatus(t)} className="mt-1">
                    {t.status === "done" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : t.status === "in_progress" ? (
                      <Loader2 className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                      {t.title}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                      <span className={priorityColor[t.priority]}>● {t.priority}</span>
                      {t.dueDate && <span>Due {new Date(t.dueDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del.mutate(t.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {!isLoading && tasks.filter((t) => t.status === g.status).length === 0 && (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  {g.status === "todo" ? "Nothing to do yet" : g.status === "in_progress" ? "Nothing in progress" : "Nothing done yet"}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
