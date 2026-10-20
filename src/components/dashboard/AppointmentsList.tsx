import { Clock, User, CalendarX, MoreVertical, Edit, CheckCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTodayAppointments } from "@/hooks/useAppointments";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusStyles = {
  confirmed: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500",
    label: "Confirmado",
  },
  pending: {
    bg: "bg-amber-400/15",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-400",
    label: "Aguardando",
  },
  return: {
    bg: "bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-400",
    border: "border-sky-400",
    label: "Retorno",
  },
  completed: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
    label: "Concluído",
  },
  cancelled: {
    bg: "bg-red-500/10",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-500",
    label: "Cancelado",
  },
  no_show: {
    bg: "bg-orange-500/10",
    text: "text-orange-600",
    border: "border-orange-500",
    label: "Faltou",
  },
};

export function AppointmentsList() {
  const { appointments, isLoading } = useTodayAppointments();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-4">
          <h3 className="font-semibold text-foreground">Agenda de hoje</h3>
          <p className="text-sm text-muted-foreground">Confirmado, aguardando e cancelado</p>
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const visibleAppointments = appointments
    .filter((apt) => apt.status === 'confirmed' || apt.status === 'pending' || apt.status === 'return' || apt.status === 'cancelled')
    .slice(0, 8);

  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="border-b border-border p-4">
        <h3 className="font-semibold text-foreground">Agenda de hoje</h3>
        <p className="text-sm text-muted-foreground">Confirmado, aguardando e cancelado</p>
      </div>
      
      {visibleAppointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarX className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum agendamento para hoje</p>
          <Link to="/agenda" className="text-sm text-primary hover:underline mt-2">
            Criar novo agendamento
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-2 p-3">
            {visibleAppointments.map((appointment) => {
              const statusKey = appointment.status as keyof typeof statusStyles;
              const status = statusStyles[statusKey] || statusStyles.pending;
              const canComplete = appointment.status === 'pending' || appointment.status === 'confirmed';

              return (
                <div
                  key={appointment.id}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "group flex items-center gap-4 rounded-lg border-2 bg-card p-3 transition-colors hover:bg-muted/40 cursor-pointer",
                    status.border,
                  )}
                  onClick={() => navigate(`/agenda?focusAppointmentId=${appointment.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      navigate(`/agenda?focusAppointmentId=${appointment.id}`);
                    }
                  }}
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {appointment.start_time?.slice(0, 5)}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          status.bg,
                          status.text
                        )}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="truncate text-sm text-foreground">
                      {appointment.patient?.name || 'Paciente não informado'}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {appointment.professional?.name || 'Profissional'} • {appointment.procedure}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => navigate(`/agenda?focusAppointmentId=${appointment.id}`)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      {canComplete && (
                        <DropdownMenuItem
                          onClick={() => navigate(`/agenda?focusAppointmentId=${appointment.id}&focusAction=complete`)}
                          className="text-emerald-600 focus:text-emerald-600"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Finalizar Atendimento
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
          <div className="border-t border-border p-4">
            <Link 
              to="/agenda" 
              className="w-full block text-center text-sm font-medium text-primary hover:underline"
            >
              Ver todos os agendamentos
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
