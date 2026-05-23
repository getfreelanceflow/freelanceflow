import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Invoice, type InvoiceLineItem } from "@/lib/api";
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
import { Receipt, Plus, Trash2, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-500/20 text-slate-400",
  sent: "bg-blue-500/20 text-blue-400",
  paid: "bg-green-500/20 text-green-400",
  overdue: "bg-red-500/20 text-red-400",
};

export default function Invoices() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: api.listInvoices,
  });
  const { data: clients } = useQuery({ queryKey: ["clients"], queryFn: api.listClients });

  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState<number | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [status, setStatus] = useState<"draft" | "sent" | "paid" | "overdue">("draft");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceLineItem[]>([
    { description: "", quantity: 1, rate: 0 },
  ]);

  const total = items.reduce((s, i) => s + i.quantity * i.rate, 0);

  const reset = () => {
    setClientName("");
    setClientId(null);
    setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
    setStatus("draft");
    setDueDate("");
    setNotes("");
    setItems([{ description: "", quantity: 1, rate: 0 }]);
  };

  const create = useMutation({
    mutationFn: () =>
      api.createInvoice({
        clientId,
        clientName,
        invoiceNumber,
        amount: total,
        status,
        dueDate: dueDate || null,
        items,
        notes: notes || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["earnings"] });
      setOpen(false);
      reset();
      toast({ title: "Invoice created" });
    },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const markPaid = useMutation({
    mutationFn: (id: number) => api.updateInvoice(id, { status: "paid" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["earnings"] });
      toast({ title: "Marked as paid" });
    },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.deleteInvoice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["earnings"] });
      toast({ title: "Invoice deleted" });
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground mt-2">Create and track invoices for your clients.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Invoice #"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <Select
                value={clientId ? String(clientId) : "none"}
                onValueChange={(v) => {
                  if (v === "none") {
                    setClientId(null);
                  } else {
                    const c = clients?.find((c) => String(c.id) === v);
                    setClientId(c?.id ?? null);
                    setClientName(c?.name ?? "");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select existing client (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— New / one-off —</SelectItem>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Client name *"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />

              <div className="space-y-2">
                <p className="text-sm font-medium">Line items</p>
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <Input
                      className="col-span-6"
                      placeholder="Description"
                      value={it.description}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...it, description: e.target.value };
                        setItems(next);
                      }}
                    />
                    <Input
                      className="col-span-2"
                      type="number"
                      placeholder="Qty"
                      value={it.quantity}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...it, quantity: parseFloat(e.target.value) || 0 };
                        setItems(next);
                      }}
                    />
                    <Input
                      className="col-span-3"
                      type="number"
                      placeholder="Rate"
                      value={it.rate}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...it, rate: parseFloat(e.target.value) || 0 };
                        setItems(next);
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="col-span-1"
                      onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setItems([...items, { description: "", quantity: 1, rate: 0 }])}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Line
                </Button>
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-xl font-bold text-primary">${total.toFixed(2)}</span>
              </div>

              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
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
                disabled={!clientName || !invoiceNumber || create.isPending}
              >
                {create.isPending ? "Creating..." : "Create Invoice"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex items-center gap-3 self-end md:self-center">
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-8 w-24 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : invoices && invoices.length > 0 ? (
        <div className="grid gap-4">
          {invoices.map((inv: Invoice) => (
            <Card key={inv.id}>
              <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">
                      {inv.invoiceNumber} • {inv.clientName}
                    </h3>
                    <Badge className={STATUS_COLORS[inv.status] ?? ""}>{inv.status}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {inv.dueDate
                      ? `Due ${new Date(inv.dueDate).toLocaleDateString()}`
                      : `Created ${new Date(inv.createdAt).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-primary">
                    ${inv.amount.toLocaleString()}
                  </span>
                  {inv.status !== "paid" && (
                    <Button size="sm" variant="outline" onClick={() => markPaid.mutate(inv.id)}>
                      Mark Paid
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("Delete invoice?")) del.mutate(inv.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border rounded-lg bg-card/30">
          <Receipt className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-medium">No invoices yet</h3>
          <p className="text-muted-foreground mt-2">Create your first invoice to get paid.</p>
        </div>
      )}
    </div>
  );
}
