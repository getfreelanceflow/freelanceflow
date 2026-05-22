import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ServicePackage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Package,
  Plus,
  Trash2,
  Pencil,
  Copy,
  ExternalLink,
  Eye,
  MessageCircle,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

type FormState = {
  title: string;
  tagline: string;
  description: string;
  price: string;
  currency: string;
  deliveryDays: string;
  revisions: string;
  deliverables: string;
  category: string;
  ctaUrl: string;
  isPublic: boolean;
};

const empty: FormState = {
  title: "",
  tagline: "",
  description: "",
  price: "",
  currency: "USD",
  deliveryDays: "7",
  revisions: "2",
  deliverables: "",
  category: "",
  ctaUrl: "",
  isPublic: true,
};

function toBody(f: FormState) {
  return {
    title: f.title.trim(),
    tagline: f.tagline.trim() || null,
    description: f.description.trim(),
    price: Number(f.price) || 0,
    currency: f.currency.trim().toUpperCase() || "USD",
    deliveryDays: parseInt(f.deliveryDays, 10) || 7,
    revisions: parseInt(f.revisions, 10) || 0,
    deliverables: f.deliverables
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    category: f.category.trim() || null,
    ctaUrl: f.ctaUrl.trim() || null,
    isPublic: f.isPublic,
  } as unknown as Partial<ServicePackage>;
}

function fromPackage(p: ServicePackage): FormState {
  return {
    title: p.title,
    tagline: p.tagline ?? "",
    description: p.description,
    price: p.price,
    currency: p.currency,
    deliveryDays: String(p.deliveryDays),
    revisions: String(p.revisions),
    deliverables: (p.deliverables ?? []).join("\n"),
    category: p.category ?? "",
    ctaUrl: p.ctaUrl ?? "",
    isPublic: p.isPublic,
  };
}

export default function Packages() {
  const qc = useQueryClient();
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["packages"],
    queryFn: api.listPackages,
  });

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["packages"] });
  const create = useMutation({
    mutationFn: (b: Partial<ServicePackage>) => api.createPackage(b),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setForm(empty);
      toast.success("Package created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<ServicePackage> }) =>
      api.updatePackage(id, body),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setEditingId(null);
      setForm(empty);
      toast.success("Package updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: api.deletePackage,
    onSuccess: () => {
      invalidate();
      toast.success("Package deleted");
    },
  });

  function openNew() {
    setEditingId(null);
    setForm(empty);
    setOpen(true);
  }
  function openEdit(p: ServicePackage) {
    setEditingId(p.id);
    setForm(fromPackage(p));
    setOpen(true);
  }
  function save() {
    if (!form.title.trim() || !form.description.trim() || !form.price) {
      toast.error("Title, description, and price are required");
      return;
    }
    const body = toBody(form);
    if (editingId == null) create.mutate(body);
    else update.mutate({ id: editingId, body });
  }
  function shareUrl(slug: string) {
    return `${window.location.origin}/p/${slug}`;
  }
  async function copyShare(slug: string) {
    try {
      await navigator.clipboard.writeText(shareUrl(slug));
      toast.success("Share link copied");
    } catch {
      toast.error("Copy failed — select & copy the URL manually");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Service Packages</h1>
          <p className="text-muted-foreground">
            Productize your offerings. Share a link with prospects and turn conversations into bookings.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" /> New package
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId == null ? "New package" : "Edit package"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Landing Page Refresh"
                />
              </div>
              <div className="grid gap-2">
                <Label>Tagline (optional)</Label>
                <Input
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  placeholder="A one-line pitch"
                />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={5}
                  placeholder="What's included, who it's for, what outcome they get."
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Price</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Currency</Label>
                  <Input
                    maxLength={3}
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. Design"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Delivery (days)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.deliveryDays}
                    onChange={(e) => setForm({ ...form, deliveryDays: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Revisions included</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.revisions}
                    onChange={(e) => setForm({ ...form, revisions: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Deliverables (one per line)</Label>
                <Textarea
                  value={form.deliverables}
                  onChange={(e) => setForm({ ...form, deliverables: e.target.value })}
                  rows={4}
                  placeholder={"3 design concepts\nFinal Figma file\n2 rounds of revisions"}
                />
              </div>
              <div className="grid gap-2">
                <Label>Booking / payment link (optional)</Label>
                <Input
                  type="url"
                  value={form.ctaUrl}
                  onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
                  placeholder="https://buy.stripe.com/... or https://calendly.com/..."
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Public</Label>
                  <p className="text-xs text-muted-foreground">
                    Anyone with the link can view this package
                  </p>
                </div>
                <Switch
                  checked={form.isPublic}
                  onCheckedChange={(v) => setForm({ ...form, isPublic: v })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={create.isPending || update.isPending}>
                {editingId == null ? "Create" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : packages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No packages yet</h3>
            <p className="text-muted-foreground max-w-md mt-2">
              Productize a service you offer often. Set a fixed price, deliverables, and timeline —
              then share the link with prospects to skip the back-and-forth.
            </p>
            <Button className="mt-6" onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" /> Create your first package
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => (
            <Card key={p.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{p.title}</CardTitle>
                    {p.tagline && (
                      <CardDescription className="line-clamp-2">{p.tagline}</CardDescription>
                    )}
                  </div>
                  {!p.isPublic && <Badge variant="outline">Private</Badge>}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <div className="flex items-baseline gap-1">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-2xl font-bold">
                    {Number(p.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-sm text-muted-foreground">{p.currency}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.deliveryDays}-day delivery · {p.revisions} revision
                  {p.revisions === 1 ? "" : "s"}
                </div>
                {p.deliverables?.length > 0 && (
                  <ul className="text-sm space-y-1">
                    {p.deliverables.slice(0, 3).map((d, i) => (
                      <li key={i} className="text-muted-foreground line-clamp-1">
                        • {d}
                      </li>
                    ))}
                    {p.deliverables.length > 3 && (
                      <li className="text-xs text-muted-foreground">
                        +{p.deliverables.length - 3} more
                      </li>
                    )}
                  </ul>
                )}
                <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {p.views}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" /> {p.inquiries}
                  </span>
                </div>
              </CardContent>
              <div className="flex gap-2 p-4 pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => copyShare(p.slug)}
                  disabled={!p.isPublic}
                  title={p.isPublic ? "Copy share link" : "Make package public to share"}
                >
                  <Copy className="h-3 w-3 mr-1" /> Share
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/p/${p.slug}`, "_blank")}
                  disabled={!p.isPublic}
                  title="Open public page"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Delete "${p.title}"?`)) del.mutate(p.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
