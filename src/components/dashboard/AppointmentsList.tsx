import { Clock, User, CalendarX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTodayAppointments } from "@/hooks/useAppointments";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

const statusStyles = {
  confirmed: {
    bg: "bg-success/10",
    text: "text-success",
    label: "Confirmado",
  },
  pending: {
    bg: "bg-warning/10",
    text: "text-warning",
    label: "Pendente",
  },
  return: {
    bg: "bg-info/10",
    text: "text-info",
    label: "Retorno",
  },
  completed: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    label: "Concluído",
  },
  cancelled: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    label: "Cancelado",
  },
};

export function AppointmentsList() {
  const { appointments, isLoading } = useTodayAppointments();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-4">
          <h3 className="font-semibold text-foreground">Próximas Consultas</h3>
          <p className="text-sm text-muted-foreground">Agendamentos de hoje</p>
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

  // Filter out cancelled and show only active appointments
  const activeAppointments = appointments.filter(
    apt => apt.status !== 'cancelled' && apt.status !== 'completed'
  ).slice(0, 5);

  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="border-b border-border p-4">
        <h3 className="font-semibold text-foreground">Próximas Consultas</h3>
        <p className="text-sm text-muted-foreground">Agendamentos de hoje</p>
      </div>
      
      {activeAppointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarX className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum agendamento para hoje</p>
          <Link to="/agenda" className="text-sm text-primary hover:underline mt-2">
            Criar novo agendamento
          </Link>
        </div>
      ) : (
        <>
          <div className="divide-y divide-border">
            {activeAppointments.map((appointment) => {
              const statusKey = appointment.status as keyof typeof statusStyles;
              const status = statusStyles[statusKey] || statusStyles.pending;
              
              return (
                <div
                  key={appointment.id}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
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
