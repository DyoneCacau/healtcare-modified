import { CalendarCheck, Clock, AlertCircle, RotateCcw } from 'lucide-react';
import { AgendaAppointment } from '@/types/agenda';

interface AgendaStatsProps {
  appointments: AgendaAppointment[];
}

export function AgendaStats({ appointments }: AgendaStatsProps) {
  const stats = {
    total: appointments.length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    pending: appointments.filter((a) => a.status === 'pending').length,
    return: appointments.filter((a) => a.status === 'return').length,
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <CalendarCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
          <CalendarCheck className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <p className="text-2xl font-bold text-emerald-600">{stats.confirmed}</p>
          <p className="text-xs text-muted-foreground">Confirmados</p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
          <AlertCircle className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          <p className="text-xs text-muted-foreground">Pendentes</p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
          <RotateCcw className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <p className="text-2xl font-bold text-blue-600">{stats.return}</p>
          <p className="text-xs text-muted-foreground">Retornos</p>
        </div>
      </div>
    </div>
  );
}
