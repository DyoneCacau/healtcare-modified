import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductivityReport as ProductivityData } from '@/types/reports';
import { Users, Trophy, Target, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface ProductivityReportProps {
  data: ProductivityData[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function ProductivityReport({ data }: ProductivityReportProps) {
  const totalRevenue = data.reduce((acc, p) => acc + p.revenue, 0);
  const totalAppointments = data.reduce((acc, p) => acc + p.completedAppointments, 0);
  const topPerformer = data.reduce((a, b) => (a.revenue > b.revenue ? a : b));

  const chartData = data.map((prof) => ({
    name: prof.professionalName.split(' ').slice(0, 2).join(' '),
    completed: prof.completedAppointments,
    cancelled: prof.cancelledAppointments,
    revenue: prof.revenue,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Profissionais Ativos</p>
                <p className="text-3xl font-bold">{data.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <Target className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Atendimentos</p>
                <p className="text-3xl font-bold">{totalAppointments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-amber-200 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-amber-700">Destaque do Período</p>
                <p className="text-lg font-bold text-amber-800">{topPerformer.professionalName}</p>
                <p className="text-xs text-amber-600">{formatCurrency(topPerformer.revenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Appointments Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atendimentos por Profissional</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" name="Concluídos" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cancelled" name="Cancelados" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Faturamento por Profissional</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="revenue" name="Faturamento" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Ranking de Produtividade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">#</th>
                  <th className="text-left p-3 font-medium">Profissional</th>
                  <th className="text-right p-3 font-medium">Total</th>
                  <th className="text-right p-3 font-medium">Concluídos</th>
                  <th className="text-right p-3 font-medium">Cancelados</th>
                  <th className="text-right p-3 font-medium">Taxa</th>
                  <th className="text-right p-3 font-medium">Média/Dia</th>
                  <th className="text-right p-3 font-medium">Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {data
                  .sort((a, b) => b.revenue - a.revenue)
                  .map((prof, index) => {
                    const rate = ((prof.completedAppointments / prof.totalAppointments) * 100).toFixed(0);
                    return (
                      <tr key={prof.professionalId} className="border-b hover:bg-muted/30">
                        <td className="p-3">
                          {index === 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                              1
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{index + 1}</span>
                          )}
                        </td>
                        <td className="p-3 font-medium">{prof.professionalName}</td>
                        <td className="text-right p-3">{prof.totalAppointments}</td>
                        <td className="text-right p-3 text-emerald-600">{prof.completedAppointments}</td>
                        <td className="text-right p-3 text-red-600">{prof.cancelledAppointments}</td>
                        <td className="text-right p-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            Number(rate) >= 90 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : Number(rate) >= 70 
                              ? 'bg-amber-100 text-amber-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {rate}%
                          </span>
                        </td>
                        <td className="text-right p-3">{prof.averagePerDay.toFixed(1)}</td>
                        <td className="text-right p-3 font-medium">{formatCurrency(prof.revenue)}</td>
                      </tr>
                    );
                  })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-medium">
                  <td className="p-3" colSpan={2}>Total Geral</td>
                  <td className="text-right p-3">
                    {data.reduce((acc, p) => acc + p.totalAppointments, 0)}
                  </td>
                  <td className="text-right p-3 text-emerald-600">
                    {data.reduce((acc, p) => acc + p.completedAppointments, 0)}
                  </td>
                  <td className="text-right p-3 text-red-600">
                    {data.reduce((acc, p) => acc + p.cancelledAppointments, 0)}
                  </td>
                  <td className="text-right p-3">-</td>
                  <td className="text-right p-3">-</td>
                  <td className="text-right p-3">{formatCurrency(totalRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
