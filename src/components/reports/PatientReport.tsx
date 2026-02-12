import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PatientSummary } from '@/types/reports';
import { Users, UserPlus, UserCheck, TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

interface PatientReportProps {
  data: PatientSummary;
}

export function PatientReport({ data }: PatientReportProps) {
  const activeRate = ((data.activePatients / data.totalPatients) * 100).toFixed(1);

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
                <p className="text-sm text-muted-foreground">Total de Pacientes</p>
                <p className="text-3xl font-bold">{data.totalPatients.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pacientes Ativos</p>
                <p className="text-3xl font-bold">{data.activePatients.toLocaleString()}</p>
                <p className="text-xs text-emerald-600">{activeRate}% do total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Novos Este Mês</p>
                <p className="text-3xl font-bold">{data.newPatientsThisMonth}</p>
                <p className="text-xs text-blue-600">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  Crescimento ativo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* New Patients Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Novos Pacientes por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.patientsByMonth}>
                <defs>
                  <linearGradient id="colorNewPatients" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="newPatients"
                  name="Novos Pacientes"
                  stroke="#0ea5e9"
                  fillOpacity={1}
                  fill="url(#colorNewPatients)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Appointments Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atendimentos por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.patientsByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="totalAppointments"
                  name="Total de Atendimentos"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981' }}
                />
                <Line
                  type="monotone"
                  dataKey="newPatients"
                  name="Novos Pacientes"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={{ fill: '#0ea5e9' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalhamento Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Mês</th>
                  <th className="text-right p-3 font-medium">Novos Pacientes</th>
                  <th className="text-right p-3 font-medium">Total de Atendimentos</th>
                  <th className="text-right p-3 font-medium">Média por Paciente</th>
                </tr>
              </thead>
              <tbody>
                {data.patientsByMonth.map((month) => (
                  <tr key={month.month} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">{month.month}</td>
                    <td className="text-right p-3">{month.newPatients}</td>
                    <td className="text-right p-3">{month.totalAppointments}</td>
                    <td className="text-right p-3 text-muted-foreground">
                      {month.newPatients > 0 
                        ? (month.totalAppointments / month.newPatients).toFixed(1) 
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
