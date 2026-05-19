import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Template } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { FileStack, Plus, Trash2, Copy } from "lucide-react";

export default function Templates() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: items, isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: api.listTemplates,
  });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("proposal");
  const [content, setContent] = useState("");

  const create = useMutation({
    mutationFn: () => api.createTemplate({ name, category, content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      setOpen(false);
      setName("");
      setCategory("proposal");
      setContent("");
      toast({ title: "Template saved" });
    },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => api.deleteTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Template deleted" });
    },
  });

  const copy = (t: Template) => {
    navigator.clipboard.writeText(t.content);
    toast({ title: `"${t.name}" copied` });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proposal Templates</h1>
          <p className="text-muted-foreground mt-2">
            Save your best-performing proposals as reusable starting points.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Template name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                placeholder="Category (e.g., web-dev, design)"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
              <Textarea
                rows={10}
                placeholder="Template content *"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => create.mutate()}
                disabled={!name || !content || create.isPending}
              >
                {create.isPending ? "Saving..." : "Save Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : items && items.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{t.name}</span>
                  <Badge variant="secondary">{t.category}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-line">
                  {t.content}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copy(t)}>
                    <Copy className="mr-2 h-3 w-3" /> Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("Delete template?")) del.mutate(t.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border rounded-lg bg-card/30">
          <FileStack className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-medium">No templates saved</h3>
          <p className="text-muted-foreground mt-2">
            Create reusable templates to speed up future proposals.
          </p>
        </div>
      )}
    </div>
  );
}
