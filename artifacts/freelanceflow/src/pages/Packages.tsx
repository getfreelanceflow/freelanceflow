import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ServicePackage, type PackageTier } from "@/lib/api";
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
  Layers,
  X,
} from "lucide-react";
import { toast } from "sonner";

type TierForm = {
  name: string;
  price: string;
  deliveryDays: string;
  revisions: string;
  deliverables: string;
};

type FaqForm = { question: string; answer: string };

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
  tiered: boolean;
  tiers: TierForm[];
  faqs: FaqForm[];
};

const DEFAULT_TIERS: TierForm[] = [
  { name: "Basic", price: "", deliveryDays: "7", revisions: "1", deliverables: "" },
  { name: "Standard", price: "", deliveryDays: "10", revisions: "2", deliverables: "" },
  { name: "Premium", price: "", deliveryDays: "14", revisions: "3", deliverables: "" },
];

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
  tiered: false,
  tiers: DEFAULT_TIERS,
  faqs: [],
};

function tiersToApi(tiers: TierForm[]): PackageTier[] {
  return tiers
    .filter((t) => t.name.trim() && t.price.trim())
    .map((t) => ({
      name: t.name.trim(),
      price: Number(t.price) || 0,
      deliveryDays: parseInt(t.deliveryDays, 10) || 7,
      revisions: parseInt(t.revisions, 10) || 0,
      deliverables: t.deliverables
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    }));
}

function toBody(f: FormState) {
  const tiers = f.tiered ? tiersToApi(f.tiers) : [];
  // When tiered, anchor base price to the cheapest tier so card previews and
  // single-tier fallbacks still show a sensible number.
  const basePrice = f.tiered && tiers.length > 0
    ? Math.min(...tiers.map((t) => t.price))
    : (Number(f.price) || 0);
  return {
    title: f.title.trim(),
    tagline: f.tagline.trim() || null,
    description: f.description.trim(),
    price: basePrice,
    currency: f.currency.trim().toUpperCase() || "USD",
    deliveryDays: parseInt(f.deliveryDays, 10) || 7,
    revisions: parseInt(f.revisions, 10) || 0,
    deliverables: f.deliverables
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    tiers,
    faqs: f.faqs
      .map((q) => ({ question: q.question.trim(), answer: q.answer.trim() }))
      .filter((q) => q.question && q.answer),
    category: f.category.trim() || null,
    ctaUrl: f.ctaUrl.trim() || null,
    isPublic: f.isPublic,
  } as unknown as Partial<ServicePackage>;
}

function fromPackage(p: ServicePackage): FormState {
  const hasTiers = (p.tiers ?? []).length > 0;
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
    tiered: hasTiers,
    tiers: hasTiers
      ? p.tiers.map((t) => ({
          name: t.name,
          price: String(t.price),
          deliveryDays: String(t.deliveryDays),
          revisions: String(t.revisions),
          deliverables: t.deliverables.join("\n"),
        }))
      : DEFAULT_TIERS,
    faqs: (p.faqs ?? []).map((q) => ({ question: q.question, answer: q.answer })),
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
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    if (form.tiered) {
      const valid = tiersToApi(form.tiers);
      if (valid.length === 0) {
        toast.error("Add at least one tier with a name and price");
        return;
      }
    } else if (!form.price) {
      toast.error("Price is required (or enable tiered pricing)");
      return;
    }
    const body = toBody(form);
    if (editingId == null) create.mutate(body);
    else update.mutate({ id: editingId, body });
  }
  function updateTier(idx: number, patch: Partial<TierForm>) {
    setForm({
      ...form,
      tiers: form.tiers.map((t, i) => (i === idx ? { ...t, ...patch } : t)),
    });
  }
  function addTier() {
    if (form.tiers.length >= 5) return;
    setForm({
      ...form,
      tiers: [
        ...form.tiers,
        { name: `Tier ${form.tiers.length + 1}`, price: "", deliveryDays: "7", revisions: "1", deliverables: "" },
      ],
    });
  }
  function addFaq() {
    if (form.faqs.length >= 20) return;
    setForm({ ...form, faqs: [...form.faqs, { question: "", answer: "" }] });
  }
  function updateFaq(idx: number, patch: Partial<FaqForm>) {
    setForm({
      ...form,
      faqs: form.faqs.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
    });
  }
  function removeFaq(idx: number) {
    setForm({ ...form, faqs: form.faqs.filter((_, i) => i !== idx) });
  }
  function removeTier(idx: number) {
    setForm({ ...form, tiers: form.tiers.filter((_, i) => i !== idx) });
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                  rows={4}
                  placeholder="What's included, who it's for, what outcome they get."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
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

              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                <div className="flex items-start gap-3">
                  <Layers className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <Label className="text-sm">Tiered pricing (Basic / Standard / Premium)</Label>
                    <p className="text-xs text-muted-foreground">
                      Offer multiple price points so buyers self-select the right fit.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={form.tiered}
                  onCheckedChange={(v) => setForm({ ...form, tiered: v })}
                />
              </div>

              {form.tiered ? (
                <div className="space-y-3">
                  {form.tiers.map((t, i) => (
                    <Card key={i} className="border-primary/30">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <Input
                            className="font-semibold w-44"
                            value={t.name}
                            onChange={(e) => updateTier(i, { name: e.target.value })}
                            placeholder="Tier name"
                          />
                          {form.tiers.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTier(i)}
                              aria-label="Remove tier"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="grid gap-1">
                            <Label className="text-xs">Price</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={t.price}
                              onChange={(e) => updateTier(i, { price: e.target.value })}
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label className="text-xs">Delivery (days)</Label>
                            <Input
                              type="number"
                              min="1"
                              value={t.deliveryDays}
                              onChange={(e) => updateTier(i, { deliveryDays: e.target.value })}
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label className="text-xs">Revisions</Label>
                            <Input
                              type="number"
                              min="0"
                              value={t.revisions}
                              onChange={(e) => updateTier(i, { revisions: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs">What's included (one per line)</Label>
                          <Textarea
                            rows={3}
                            value={t.deliverables}
                            onChange={(e) => updateTier(i, { deliverables: e.target.value })}
                            placeholder={"Item 1\nItem 2"}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {form.tiers.length < 5 && (
                    <Button variant="outline" size="sm" onClick={addTier} className="w-full">
                      <Plus className="h-4 w-4 mr-2" /> Add another tier
                    </Button>
                  )}
                </div>
              ) : (
                <>
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
                      <Label>Delivery (days)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={form.deliveryDays}
                        onChange={(e) => setForm({ ...form, deliveryDays: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Revisions</Label>
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
                </>
              )}

              <div className="grid gap-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>FAQs (optional)</Label>
                    <p className="text-xs text-muted-foreground">
                      Pre-answer the questions every client asks — builds trust and reduces back-and-forth.
                    </p>
                  </div>
                  {form.faqs.length < 20 && (
                    <Button type="button" variant="outline" size="sm" onClick={addFaq}>
                      <Plus className="h-4 w-4 mr-1" /> Add FAQ
                    </Button>
                  )}
                </div>
                {form.faqs.map((q, i) => (
                  <div key={i} className="grid gap-2 p-3 rounded-md border bg-muted/30 relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1 h-7 w-7 p-0"
                      onClick={() => removeFaq(i)}
                      aria-label="Remove FAQ"
                    >
                      ×
                    </Button>
                    <Input
                      value={q.question}
                      onChange={(e) => updateFaq(i, { question: e.target.value })}
                      placeholder="Question (e.g. Do you offer revisions?)"
                    />
                    <Textarea
                      value={q.answer}
                      onChange={(e) => updateFaq(i, { answer: e.target.value })}
                      rows={2}
                      placeholder="Answer…"
                    />
                  </div>
                ))}
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
          {packages.map((p) => {
            const hasTiers = (p.tiers ?? []).length > 0;
            return (
              <Card key={p.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="truncate">{p.title}</CardTitle>
                      {p.tagline && (
                        <CardDescription className="line-clamp-2">{p.tagline}</CardDescription>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {hasTiers && (
                        <Badge variant="secondary" className="gap-1">
                          <Layers className="h-3 w-3" />
                          {p.tiers.length} tiers
                        </Badge>
                      )}
                      {!p.isPublic && <Badge variant="outline">Private</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div className="flex items-baseline gap-1">
                    {hasTiers && (
                      <span className="text-xs text-muted-foreground mr-1">from</span>
                    )}
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="text-2xl font-bold">
                      {Number(p.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-sm text-muted-foreground">{p.currency}</span>
                  </div>
                  {hasTiers ? (
                    <ul className="text-sm space-y-1">
                      {p.tiers.map((t, i) => (
                        <li key={i} className="text-muted-foreground flex justify-between gap-2">
                          <span className="truncate">{t.name}</span>
                          <span className="text-foreground font-medium whitespace-nowrap">
                            {Number(t.price).toLocaleString(undefined, { maximumFractionDigits: 2 })} {p.currency}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <>
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
                    </>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
