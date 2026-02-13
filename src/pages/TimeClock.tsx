import { useState, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Clock,
  Play,
  Coffee,
  Square,
  CheckCircle,
  AlertCircle,
  Calendar,
  Timer,
  Edit,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TimeClockCorrectionDialog } from '@/components/timeclock/TimeClockCorrectionDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TimeClockEntry {
  id: string;
  user_id: string;
  entry_type: string;
  timestamp: string;
  is_correction: boolean;
  correction_status: string;
  correction_reason: string | null;
}

type PeriodFilter = '7' | '15' | '30';

interface DaySummary {
  date: string;
  dateFormatted: string;
  clockIn: string | null;
  lunchStart: string | null;
  lunchEnd: string | null;
  clockOut: string | null;
  hasPending: boolean;
  hasRejected: boolean;
  isComplete: boolean;
}

export default function TimeClock() {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState<TimeClockEntry[]>([]);
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('15');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user) {
      fetchEntries();
    }
  }, [user]);

  const fetchEntries = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('time_clock_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching entries:', error);
    } else {
      setEntries(data || []);
    }
  };

  const today = format(new Date(), 'yyyy-MM-dd');

  const todayEntries = useMemo(() => {
    return entries.filter((e) => e.timestamp.startsWith(today) && e.correction_status === 'approved');
  }, [entries, today]);

  const hasClockIn = todayEntries.some((e) => e.entry_type === 'clock_in');
  const hasClockOut = todayEntries.some((e) => e.entry_type === 'clock_out');
  const hasLunchStart = todayEntries.some((e) => e.entry_type === 'lunch_start');
  const hasLunchEnd = todayEntries.some((e) => e.entry_type === 'lunch_end');

  const currentStatus = useMemo(() => {
    if (!hasClockIn) return 'not_started';
    if (hasClockOut) return 'completed';
    if (hasLunchStart && !hasLunchEnd) return 'lunch';
    return 'working';
  }, [hasClockIn, hasClockOut, hasLunchStart, hasLunchEnd]);

  const pendingCorrections = entries.filter((e) => e.correction_status === 'pending');

  const entriesByDay = useMemo(() => {
    const days = periodFilter === '7' ? 7 : periodFilter === '15' ? 15 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);

    const filtered = entries.filter(
      (e) => new Date(e.timestamp) >= cutoff
    );

    const byDate = new Map<string, TimeClockEntry[]>();
    for (const e of filtered) {
      const d = e.timestamp.slice(0, 10);
      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d)!.push(e);
    }

    const summaries: DaySummary[] = [];
    byDate.forEach((dayEntries, date) => {
      const approved = dayEntries.filter((e) => e.correction_status === 'approved');
      const getTime = (type: string) => {
        const ent = approved.find((e) => e.entry_type === type);
        return ent ? format(new Date(ent.timestamp), 'HH:mm') : null;
      };
      const clockIn = getTime('clock_in');
      const lunchStart = getTime('lunch_start');
      const lunchEnd = getTime('lunch_end');
      const clockOut = getTime('clock_out');
      const hasPending = dayEntries.some((e) => e.correction_status === 'pending');
      const hasRejected = dayEntries.some((e) => e.correction_status === 'rejected');
      summaries.push({
        date,
        dateFormatted: format(new Date(date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }),
        clockIn,
        lunchStart,
        lunchEnd,
        clockOut,
        hasPending,
        hasRejected,
        isComplete: !!(clockIn && clockOut),
      });
    });

    summaries.sort((a, b) => b.date.localeCompare(a.date));
    return summaries;
  }, [entries, periodFilter]);

  const weekStats = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekEntries = entries.filter(
      (e) => new Date(e.timestamp) >= weekAgo && e.correction_status === 'approved'
    );

    const clockIns = weekEntries.filter((e) => e.entry_type === 'clock_in').length;

    return {
      days: clockIns,
      hours: clockIns * 8, // Approximate
      average: 8,
    };
  }, [entries]);

  const handleClockAction = async (entryType: string) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    const { error } = await supabase.from('time_clock_entries').insert({
      user_id: user.id,
      entry_type: entryType,
      timestamp: new Date().toISOString(),
      is_correction: false,
      correction_status: 'approved',
    });

    if (error) {
      toast.error('Erro ao registrar ponto');
      console.error(error);
    } else {
      const labels: Record<string, string> = {
        clock_in: 'Entrada registrada',
        clock_out: 'Saída registrada',
        lunch_start: 'Intervalo iniciado',
        lunch_end: 'Intervalo finalizado',
      };
      toast.success(labels[entryType] + '!');
      fetchEntries();
    }
  };

  const handleCorrectionSubmit = async (correction: {
    date: string;
    entryType: string;
    time: string;
    reason: string;
  }) => {
    if (!user) return;

    const timestamp = new Date(`${correction.date}T${correction.time}`).toISOString();

    const { error } = await supabase.from('time_clock_entries').insert({
      user_id: user.id,
      entry_type: correction.entryType,
      timestamp,
      is_correction: true,
      correction_status: 'pending',
      correction_reason: correction.reason,
    });

    if (error) {
      toast.error('Erro ao enviar correção');
    } else {
      toast.success('Solicitação de correção enviada para aprovação!');
      fetchEntries();
    }
  };

  const getStatusBadge = () => {
    switch (currentStatus) {
      case 'working':
        return <Badge className="bg-emerald-500">Trabalhando</Badge>;
      case 'lunch':
        return <Badge className="bg-amber-500">Em Intervalo</Badge>;
      case 'completed':
        return <Badge variant="secondary">Jornada Concluída</Badge>;
      default:
        return <Badge variant="outline">Aguardando Entrada</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-7 w-7 text-primary" />
            Registro de Ponto
          </h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        {/* Pending Corrections Alert */}
        {pendingCorrections.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="h-5 w-5" />
                <span>
                  Você tem {pendingCorrections.length} correção(ões) pendente(s) de
                  aprovação
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Status */}
        <Card className="border-2 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-4xl font-bold text-primary">
                <Timer className="h-10 w-10" />
                {format(currentTime, 'HH:mm:ss')}
              </div>

              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">{profile?.name || 'Usuário'}</span>
                {getStatusBadge()}
              </div>

              {hasClockIn && (
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
                  <span className="font-medium text-blue-600">
                    Entrada: {format(new Date(todayEntries.find((e) => e.entry_type === 'clock_in')!.timestamp), 'HH:mm')}
                  </span>
                  {hasLunchStart && (
                    <span className="font-medium text-amber-600">
                      Intervalo: {format(new Date(todayEntries.find((e) => e.entry_type === 'lunch_start')!.timestamp), 'HH:mm')}
                      {hasLunchEnd && ` - ${format(new Date(todayEntries.find((e) => e.entry_type === 'lunch_end')!.timestamp), 'HH:mm')}`}
                    </span>
                  )}
                  {hasClockOut && (
                    <span className="font-medium text-red-600">
                      Saída: {format(new Date(todayEntries.find((e) => e.entry_type === 'clock_out')!.timestamp), 'HH:mm')}
                    </span>
                  )}
                </div>
              )}

              <Separator className="my-4" />

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-center gap-4">
                {currentStatus === 'not_started' && (
                  <Button
                    size="lg"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleClockAction('clock_in')}
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Registrar Entrada
                  </Button>
                )}

                {currentStatus === 'working' && !hasLunchStart && (
                  <Button size="lg" variant="outline" onClick={() => handleClockAction('lunch_start')}>
                    <Coffee className="mr-2 h-5 w-5" />
                    Iniciar Intervalo
                  </Button>
                )}

                {currentStatus === 'lunch' && (
                  <Button
                    size="lg"
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={() => handleClockAction('lunch_end')}
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Finalizar Intervalo
                  </Button>
                )}

                {currentStatus === 'working' && (
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={() => handleClockAction('clock_out')}
                  >
                    <Square className="mr-2 h-5 w-5" />
                    Registrar Saída
                  </Button>
                )}

                {currentStatus === 'completed' && (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle className="h-6 w-6" />
                    <span className="text-lg font-medium">Jornada concluída</span>
                  </div>
                )}

                <Button variant="outline" onClick={() => setCorrectionDialogOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Solicitar Correção
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dias Trabalhados (Semana)</p>
                  <p className="text-2xl font-bold">{weekStats.days}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <Timer className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Horas Totais (Semana)</p>
                  <p className="text-2xl font-bold">{weekStats.hours}h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Média Diária</p>
                  <p className="text-2xl font-bold">{weekStats.average}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Registros por dia */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Meus Registros</CardTitle>
            <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="15">Últimos 15 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Data</th>
                    <th className="text-left p-3 font-medium">Entrada</th>
                    <th className="text-left p-3 font-medium">Intervalo</th>
                    <th className="text-left p-3 font-medium">Retorno</th>
                    <th className="text-left p-3 font-medium">Saída</th>
                    <th className="text-center p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {entriesByDay.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        Nenhum registro no período
                      </td>
                    </tr>
                  ) : (
                    entriesByDay.map((day) => (
                      <tr key={day.date} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3">
                          <span className="font-medium">{day.dateFormatted}</span>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(day.date + 'T12:00:00'), 'EEEE', { locale: ptBR })}
                          </p>
                        </td>
                        <td className="p-3">{day.clockIn ?? '—'}</td>
                        <td className="p-3">{day.lunchStart ?? '—'}</td>
                        <td className="p-3">{day.lunchEnd ?? '—'}</td>
                        <td className="p-3">{day.clockOut ?? '—'}</td>
                        <td className="p-3 text-center">
                          {day.hasPending && (
                            <Badge variant="secondary">Pendente</Badge>
                          )}
                          {day.hasRejected && !day.hasPending && (
                            <Badge variant="destructive">Rejeitado</Badge>
                          )}
                          {!day.hasPending && !day.hasRejected && (
                            <Badge variant={day.isComplete ? 'default' : 'outline'}>
                              {day.isComplete ? 'Jornada concluída' : 'Parcial'}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <TimeClockCorrectionDialog
        open={correctionDialogOpen}
        onOpenChange={setCorrectionDialogOpen}
        onSubmit={handleCorrectionSubmit}
      />
    </MainLayout>
  );
}
