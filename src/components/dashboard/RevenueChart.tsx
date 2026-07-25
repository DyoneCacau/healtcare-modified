import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import {
  buildMonthChartPoint,
  type ChartAppointment,
  type ChartTransaction,
} from '@/lib/dashboardRevenueChart';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

const COLOR_PROJECAO = 'hsl(38, 92%, 45%)';
const COLOR_RECEITAS = 'hsl(168, 80%, 32%)';
const COLOR_DESPESAS = 'hsl(0, 72%, 51%)';

export function RevenueChart() {
  const { clinicId } = useClinic();

  const { data: chartData, isLoading } = useQuery({
    queryKey: ['revenue-chart', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];

      const now = new Date();
      const months = Array.from({ length: 6 }, (_, index) => {
        const date = subMonths(now, 5 - index);
        const start = startOfMonth(date);
        const end = endOfMonth(date);
        const labelRaw = format(date, 'MMM', { locale: ptBR }).replace('.', '');
        return {
          monthStartDate: format(start, 'yyyy-MM-dd'),
          monthEndDate: format(end, 'yyyy-MM-dd'),
          monthStartIso: start.toISOString(),
          monthEndIso: end.toISOString(),
          label: labelRaw.charAt(0).toUpperCase() + labelRaw.slice(1),
        };
      });

      const rangeStartDate = months[0].monthStartDate;
      const rangeEndDate = months[months.length - 1].monthEndDate;
      const rangeStartIso = months[0].monthStartIso;
      const rangeEndIso = months[months.length - 1].monthEndIso;

      // procedure_price / reference_* existem no banco; tipos gerados ainda não cobrem tudo.
      const sb = supabase as any;

      const [{ data: transactions, error: txError }, { data: appointments, error: aptError }] =
        await Promise.all([
          sb
            .from('financial_transactions')
            .select(
              'type, amount, created_at, category, refunded_at, deleted_at, reference_type, reference_id',
            )
            .eq('clinic_id', clinicId)
            .is('deleted_at', null)
            .gte('created_at', rangeStartIso)
            .lte('created_at', rangeEndIso),
          sb
            .from('appointments')
            .select('id, date, status, procedure_price, booking_fee')
            .eq('clinic_id', clinicId)
            .gte('date', rangeStartDate)
            .lte('date', rangeEndDate),
        ]);

      if (txError) throw txError;
      if (aptError) throw aptError;

      const chartAppointments = (appointments || []) as ChartAppointment[];
      const chartTransactions = (transactions || []) as ChartTransaction[];
      const appointmentsById: Record<string, ChartAppointment> = Object.fromEntries(
        chartAppointments.map((apt) => [apt.id, apt]),
      );

      // Sinais podem referenciar agendamentos fora do range de date do mês
      const missingIds = [
        ...new Set(
          chartTransactions
            .filter(
              (t) =>
                t.reference_type === 'appointment' &&
                t.reference_id &&
                !appointmentsById[t.reference_id],
            )
            .map((t) => t.reference_id as string),
        ),
      ];

      if (missingIds.length > 0) {
        const { data: extraApts, error: extraError } = await sb
          .from('appointments')
          .select('id, date, status, procedure_price, booking_fee')
          .in('id', missingIds);
        if (extraError) throw extraError;
        for (const apt of (extraApts || []) as ChartAppointment[]) {
          appointmentsById[apt.id] = apt;
        }
      }

      return months.map((month) =>
        buildMonthChartPoint({
          label: month.label,
          monthStartDate: month.monthStartDate,
          monthEndDate: month.monthEndDate,
          monthStartIso: month.monthStartIso,
          monthEndIso: month.monthEndIso,
          transactions: chartTransactions,
          appointments: chartAppointments,
          appointmentsById,
        }),
      );
    },
    enabled: !!clinicId,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="mb-6">
          <h3 className="font-semibold text-foreground">Receitas vs Despesas</h3>
          <p className="text-sm text-muted-foreground">Últimos 6 meses · projeção × realizado</p>
        </div>
        <Skeleton className="h-[280px]" />
      </div>
    );
  }

  const hasData =
    chartData &&
    chartData.some((d) => d.receitas > 0 || d.despesas > 0 || d.projecao > 0);

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="mb-6">
        <h3 className="font-semibold text-foreground">Receitas vs Despesas</h3>
        <p className="text-sm text-muted-foreground">
          Últimos 6 meses · âmbar = agendado · verde = finalizado no caixa · vermelho = despesa
        </p>
      </div>

      {!hasData ? (
        <div className="h-[280px] flex items-center justify-center text-muted-foreground">
          <p>Nenhuma transação ou projeção nos últimos 6 meses</p>
        </div>
      ) : (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorProjecao" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLOR_PROJECAO} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={COLOR_PROJECAO} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLOR_RECEITAS} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLOR_RECEITAS} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLOR_DESPESAS} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLOR_DESPESAS} stopOpacity={0} />
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
                tickFormatter={(value) =>
                  value >= 1000 ? `R$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : `R$${value}`
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(0, 0%, 100%)',
                  border: '1px solid hsl(214, 20%, 90%)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                formatter={(value: number, name: string) => [
                  `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                  name,
                ]}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="projecao"
                stroke={COLOR_PROJECAO}
                strokeWidth={2}
                strokeDasharray="6 4"
                fillOpacity={1}
                fill="url(#colorProjecao)"
                name="Projeção (agendado)"
              />
              <Area
                type="monotone"
                dataKey="receitas"
                stroke={COLOR_RECEITAS}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorReceitas)"
                name="Receitas (realizado)"
              />
              <Area
                type="monotone"
                dataKey="despesas"
                stroke={COLOR_DESPESAS}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorDespesas)"
                name="Despesas"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLOR_PROJECAO }} />
          <span className="text-sm text-muted-foreground">Projeção</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLOR_RECEITAS }} />
          <span className="text-sm text-muted-foreground">Receitas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLOR_DESPESAS }} />
          <span className="text-sm text-muted-foreground">Despesas</span>
        </div>
      </div>
    </div>
  );
}
