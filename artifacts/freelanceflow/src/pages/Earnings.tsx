import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, FileClock, CheckCircle2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function Earnings() {
  const { data, isLoading } = useQuery({
    queryKey: ["earnings"],
    queryFn: api.earningsSummary,
  });

  const stats = [
    {
      label: "Total Earned",
      value: `$${(data?.totalEarned ?? 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-400",
    },
    {
      label: "Outstanding",
      value: `$${(data?.totalOutstanding ?? 0).toLocaleString()}`,
      icon: FileClock,
      color: "text-yellow-400",
    },
    {
      label: "Paid Invoices",
      value: String(data?.paidCount ?? 0),
      icon: CheckCircle2,
      color: "text-primary",
    },
    {
      label: "Open Invoices",
      value: String(data?.outstandingCount ?? 0),
      icon: TrendingUp,
      color: "text-blue-400",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Earnings</h1>
        <p className="text-muted-foreground mt-2">
          Track your income, outstanding payments, and growth over time.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold">{isLoading ? "—" : s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.monthly.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthly}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                    formatter={(v: number) => `$${v.toLocaleString()}`}
                  />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              Mark invoices as paid to see your earnings chart.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
