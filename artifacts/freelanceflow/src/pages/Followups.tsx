import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Followup } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bell, Plus, Trash2, Calendar } from "lucide-react";

export default function Followups() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: items, isLoading } = useQuery({
    queryKey: ["followups"],
    queryFn: api.listFollowups,
  });
  const { data: clients } = useQuery({ queryKey: ["clients"], queryFn: api.listClients });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [clientId, setClientId] = useState<number | null>(null);

  const create = useMutation({
    mutationFn: () =>
      api.createFollowup({
        title,
        notes: notes || null,
        dueDate: new Date(dueDate).toISOString(),
        clientId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["followups"] });
      setOpen(false);
      setTitle("");
      setNotes("");
      setDueDate("");
      setClientId(null);
      toast({ title: "Follow-up added" });
    },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const toggle = useMutation({
    mutationFn: (f: Followup) => api.updateFollowup(f.id, { completed: !f.completed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["followups"] }),
  });

  const del = useMutation({
    mutationFn: (id: number) => api.deleteFollowup(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["followups"] });
      toast({ title: "Follow-up removed" });
    },
  });

  const now = Date.now();

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Follow-ups</h1>
          <p className="text-muted-foreground mt-2">
            Schedule reminders to nudge clients and stay on top of conversations.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Follow-up
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Follow-up</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="What's this about? *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <Select
                value={clientId ? String(clientId) : "none"}
                onValueChange={(v) => setClientId(v === "none" ? null : parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Link to client (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No client —</SelectItem>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => create.mutate()}
                disabled={!title || !dueDate || create.isPending}
              >
                {create.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : items && items.length > 0 ? (
        <div className="grid gap-3">
          {items.map((f) => {
            const overdue = !f.completed && new Date(f.dueDate).getTime() < now;
            return (
              <Card key={f.id} className={overdue ? "border-red-500/40" : ""}>
                <CardContent className="p-4 flex items-start gap-4">
                  <Checkbox
                    checked={f.completed}
                    onCheckedChange={() => toggle.mutate(f)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className={`font-medium ${
                          f.completed ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {f.title}
                      </p>
                      {overdue && (
                        <Badge variant="destructive" className="text-xs">
                          Overdue
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(f.dueDate).toLocaleString()}
                      </span>
                    </div>
                    {f.notes && <p className="text-sm text-muted-foreground mt-2">{f.notes}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => del.mutate(f.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 border rounded-lg bg-card/30">
          <Bell className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-medium">No follow-ups</h3>
          <p className="text-muted-foreground mt-2">
            Schedule reminders so important conversations don't slip.
          </p>
        </div>
      )}
    </div>
  );
}
