import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Client } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Users, Plus, Mail, Building, Trash2, DollarSign } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  lead: "bg-blue-500/20 text-blue-400",
  active: "bg-green-500/20 text-green-400",
  past: "bg-slate-500/20 text-slate-400",
  archived: "bg-zinc-500/20 text-zinc-500",
};

export default function Clients() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: api.listClients,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    status: "lead",
    notes: "",
    hourlyRate: "",
  });

  const create = useMutation({
    mutationFn: () =>
      api.createClient({
        name: form.name,
        email: form.email || null,
        company: form.company || null,
        status: form.status,
        notes: form.notes || null,
        hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
      setForm({ name: "", email: "", company: "", status: "lead", notes: "", hourlyRate: "" });
      toast({ title: "Client added" });
    },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => api.deleteClient(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Client deleted" });
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground mt-2">
            Track leads, active clients, and your relationships.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Client</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                placeholder="Company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
              <Input
                placeholder="Hourly rate"
                type="number"
                value={form.hourlyRate}
                onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
              />
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => create.mutate()}
                disabled={!form.name || create.isPending}
              >
                {create.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : clients && clients.length > 0 ? (
        <div className="grid gap-4">
          {clients.map((c: Client) => (
            <Card key={c.id}>
              <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{c.name}</h3>
                    <Badge className={STATUS_COLORS[c.status] ?? ""}>{c.status}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    {c.email && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" /> {c.email}
                      </span>
                    )}
                    {c.company && (
                      <span className="flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5" /> {c.company}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-primary">
                      <DollarSign className="h-3.5 w-3.5" /> ${c.totalEarned.toLocaleString()} earned
                    </span>
                  </div>
                  {c.notes && <p className="text-sm text-muted-foreground mt-2">{c.notes}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    if (confirm("Delete this client?")) del.mutate(c.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border rounded-lg bg-card/30">
          <Users className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-medium">No clients yet</h3>
          <p className="text-muted-foreground mt-2">Add your first client to start tracking.</p>
        </div>
      )}
    </div>
  );
}
