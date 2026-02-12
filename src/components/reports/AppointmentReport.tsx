import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppointmentSummary } from '@/types/reports';
import { Calendar, CheckCircle, Clock, XCircle, Users } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface AppointmentReportProps {
  data: AppointmentSummary;
}

const STATUS_COLORS = {
  confirmed: '#10b981',
  pending: '#f59e0b',
  completed: '#0ea5e9',
  cancelled: '#ef4444',
};

export function AppointmentReport({ data }: AppointmentReportProps) {
  const statusData = [
    { name: 'Confirmados', value: data.confirmed, color: STATUS_COLORS.confirmed },
    { name: 'Pendentes', value: data.pending, color: STATUS_COLORS.pending },
    { name: 'Concluídos', value: data.completed, color: STATUS_COLORS.completed },
    { name: 'Cancelados', value: data.cancelled, color: STATUS_COLORS.cancelled },
  ];

  const completionRate = ((data.completed / data.totalAppointments) * 100).toFixed(1);
  const cancellationRate = ((data.cancelled / data.totalAppointments) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{data.totalAppointments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Concluídos</p>
                <p className="text-2xl font-bold">{data.completed}</p>
                <p className="text-xs text-emerald-600">{completionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{data.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cancelados</p>
                <p className="text-2xl font-bold">{data.cancelled}</p>
                <p className="text-xs text-red-600">{cancellationRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By Procedure */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Agendamentos por Procedimento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.byProcedure} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="procedure" type="category" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Quantidade" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* By Professional */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Produtividade por Profissional
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Profissional</th>
                  <th className="text-right p-3 font-medium">Total</th>
                  <th className="text-right p-3 font-medium">Concluídos</th>
                  <th className="text-right p-3 font-medium">Taxa</th>
                  <th className="text-left p-3 font-medium">Progresso</th>
                </tr>
              </thead>
              <tbody>
                {data.byProfessional.map((prof) => {
                  const rate = ((prof.completed / prof.total) * 100).toFixed(0);
                  return (
                    <tr key={prof.professional} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{prof.professional}</td>
                      <td className="text-right p-3">{prof.total}</td>
                      <td className="text-right p-3">{prof.completed}</td>
                      <td className="text-right p-3">{rate}%</td>
                      <td className="p-3">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary rounded-full h-2 transition-all"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
