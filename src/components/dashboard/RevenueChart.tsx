import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export function RevenueChart() {
  const { clinicId } = useClinic();

  const { data: chartData, isLoading } = useQuery({
    queryKey: ['revenue-chart', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];

      // Get last 6 months of data
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        months.push({
          start: new Date(date.getFullYear(), date.getMonth(), 1).toISOString(),
          end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString(),
          label: date.toLocaleString('pt-BR', { month: 'short' }).replace('.', ''),
        });
      }

      const { data: transactions, error } = await supabase
        .from('financial_transactions')
        .select('type, amount, created_at')
        .eq('clinic_id', clinicId)
        .gte('created_at', months[0].start)
        .lte('created_at', months[months.length - 1].end);

      if (error) throw error;

      return months.map(month => {
        const monthTransactions = (transactions || []).filter(
          t => t.created_at >= month.start && t.created_at <= month.end
        );

        const receitas = monthTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const despesas = monthTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount), 0);

        return {
          month: month.label.charAt(0).toUpperCase() + month.label.slice(1),
          receitas,
          despesas,
        };
      });
    },
    enabled: !!clinicId,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="mb-6">
          <h3 className="font-semibold text-foreground">Receitas vs Despesas</h3>
          <p className="text-sm text-muted-foreground">Últimos 6 meses</p>
        </div>
        <Skeleton className="h-[280px]" />
      </div>
    );
  }

  const hasData = chartData && chartData.some(d => d.receitas > 0 || d.despesas > 0);

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="mb-6">
        <h3 className="font-semibold text-foreground">Receitas vs Despesas</h3>
        <p className="text-sm text-muted-foreground">Últimos 6 meses</p>
      </div>
      
      {!hasData ? (
        <div className="h-[280px] flex items-center justify-center text-muted-foreground">
          <p>Nenhuma transação registrada nos últimos 6 meses</p>
        </div>
      ) : (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(168, 80%, 32%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(168, 80%, 32%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
              <XAxis
                dataKey="month"
                stroke="hsl(220, 10%, 45%)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(220, 10%, 45%)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `R$${value / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0, 0%, 100%)",
                  border: "1px solid hsl(214, 20%, 90%)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
                formatter={(value: number) => [
                  `R$ ${value.toLocaleString("pt-BR")}`,
                ]}
              />
              <Area
                type="monotone"
                dataKey="receitas"
                stroke="hsl(168, 80%, 32%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorReceitas)"
                name="Receitas"
              />
              <Area
                type="monotone"
                dataKey="despesas"
                stroke="hsl(0, 72%, 51%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorDespesas)"
                name="Despesas"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      
      <div className="mt-4 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-primary" />
          <span className="text-sm text-muted-foreground">Receitas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-destructive" />
          <span className="text-sm text-muted-foreground">Despesas</span>
        </div>
      </div>
    </div>
  );
}
