import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Expense } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Receipt, FileText } from "lucide-react";

const CATEGORIES = [
  "software",
  "hardware",
  "internet",
  "office",
  "education",
  "marketing",
  "travel",
  "meals",
  "other",
];

export default function Expenses() {
  const qc = useQueryClient();
  const { data: expenses = [], isLoading } = useQuery({ queryKey: ["expenses"], queryFn: api.listExpenses });
  const { data: summary } = useQuery({ queryKey: ["expenses-summary"], queryFn: api.expensesSummary });

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("software");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [taxDeductible, setTaxDeductible] = useState(true);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["expenses-summary"] });
  };
  const create = useMutation({ mutationFn: api.createExpense, onSuccess: invalidate });
  const del = useMutation({ mutationFn: api.deleteExpense, onSuccess: invalidate });

  function add() {
    if (!description.trim() || !amount) return;
    create.mutate({
      description,
      amount: amount as unknown as string,
      category,
      date: new Date(date).toISOString(),
      taxDeductible,
    } as unknown as Partial<Expense>);
    setDescription("");
    setAmount("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
        <p className="text-muted-foreground">Track business expenses for taxes.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary?.total?.toFixed(2) ?? "0.00"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tax Deductible</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              ${summary?.deductible?.toFixed(2) ?? "0.00"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.count ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2 lg:col-span-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Adobe Creative Cloud" />
            </div>
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={taxDeductible} onCheckedChange={(v) => setTaxDeductible(!!v)} />
              Tax deductible
            </label>
            <Button onClick={add} disabled={!description.trim() || !amount}>
              <Plus className="mr-2 h-4 w-4" /> Add Expense
            </Button>
          </div>
        </CardContent>
      </Card>

      {summary?.byCategory && summary.byCategory.length > 0 && (
        <Card>
          <CardHeader><CardTitle>By Category</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summary.byCategory.map((c) => (
                <Badge key={c.category} variant="secondary" className="capitalize">
                  {c.category}: ${c.total.toFixed(2)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Recent Expenses</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <div className="py-10 text-center">
              <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <h3 className="text-base font-medium">No expenses logged</h3>
              <p className="text-sm text-muted-foreground mt-1">Log your first expense above to start tracking deductibles.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {expenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{e.description}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>${parseFloat(e.amount).toFixed(2)}</span>
                      <Badge variant="outline" className="capitalize text-xs">{e.category}</Badge>
                      <span>{new Date(e.date).toLocaleDateString()}</span>
                      {e.taxDeductible && <Badge variant="secondary" className="text-xs text-green-500">deductible</Badge>}
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
