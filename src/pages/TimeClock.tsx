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

export default function TimeClock() {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState<TimeClockEntry[]>([]);
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

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
      <div className="space-y-6 p-6">
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
                <div className="text-muted-foreground text-sm">
                  Entrada: {format(new Date(todayEntries.find((e) => e.entry_type === 'clock_in')!.timestamp), 'HH:mm')}
                  {hasLunchStart && (
                    <> | Intervalo: {format(new Date(todayEntries.find((e) => e.entry_type === 'lunch_start')!.timestamp), 'HH:mm')}</>
                  )}
                  {hasLunchEnd && (
                    <> - {format(new Date(todayEntries.find((e) => e.entry_type === 'lunch_end')!.timestamp), 'HH:mm')}</>
                  )}
                  {hasClockOut && (
                    <> | Saída: {format(new Date(todayEntries.find((e) => e.entry_type === 'clock_out')!.timestamp), 'HH:mm')}</>
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

        {/* Recent Entries */}
        <Card>
          <CardHeader>
            <CardTitle>Meus Registros Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {entries.slice(0, 10).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.timestamp), 'EEE', { locale: ptBR })}
                      </p>
                      <p className="font-bold">
                        {format(new Date(entry.timestamp), 'dd/MM')}
                      </p>
                    </div>
                    <Separator orientation="vertical" className="h-10" />
                    <div>
                      <Badge variant="outline" className="mr-2">
                        {entry.entry_type === 'clock_in' && 'Entrada'}
                        {entry.entry_type === 'clock_out' && 'Saída'}
                        {entry.entry_type === 'lunch_start' && 'Início Intervalo'}
                        {entry.entry_type === 'lunch_end' && 'Fim Intervalo'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(entry.timestamp), 'HH:mm')}
                      </span>
                      {entry.is_correction && (
                        <Badge variant="secondary" className="ml-2">
                          Correção
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={
                      entry.correction_status === 'approved'
                        ? 'default'
                        : entry.correction_status === 'pending'
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {entry.correction_status === 'approved' && 'Aprovado'}
                    {entry.correction_status === 'pending' && 'Pendente'}
                    {entry.correction_status === 'rejected' && 'Rejeitado'}
                  </Badge>
                </div>
              ))}
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
