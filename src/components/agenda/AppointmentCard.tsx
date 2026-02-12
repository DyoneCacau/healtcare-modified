import { Clock, User, MapPin, MoreVertical, MessageSquare, Edit, Trash2, Check, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { AgendaAppointment } from '@/types/agenda';

interface AppointmentCardProps {
  appointment: AgendaAppointment;
  onEdit: (appointment: AgendaAppointment) => void;
  onCancel: (appointment: AgendaAppointment) => void;
  onConfirm: (appointment: AgendaAppointment) => void;
  onComplete?: (appointment: AgendaAppointment) => void;
  onWhatsApp: (appointment: AgendaAppointment) => void;
  compact?: boolean;
}

const statusConfig = {
  confirmed: {
    label: 'Confirmado',
    bg: 'bg-emerald-500/10',
    border: 'border-l-emerald-500',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  pending: {
    label: 'Pendente',
    bg: 'bg-amber-500/10',
    border: 'border-l-amber-500',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  return: {
    label: 'Retorno',
    bg: 'bg-blue-500/10',
    border: 'border-l-blue-500',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  completed: {
    label: 'Concluído',
    bg: 'bg-muted',
    border: 'border-l-muted-foreground',
    text: 'text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
  cancelled: {
    label: 'Cancelado',
    bg: 'bg-destructive/10',
    border: 'border-l-destructive',
    text: 'text-destructive',
    dot: 'bg-destructive',
  },
};

const paymentConfig = {
  paid: { label: 'Pago', class: 'bg-emerald-100 text-emerald-700' },
  pending: { label: 'A pagar', class: 'bg-amber-100 text-amber-700' },
  partial: { label: 'Parcial', class: 'bg-blue-100 text-blue-700' },
};

export function AppointmentCard({
  appointment,
  onEdit,
  onCancel,
  onConfirm,
  onComplete,
  onWhatsApp,
  compact = false,
}: AppointmentCardProps) {
  const status = statusConfig[appointment.status];
  const payment = paymentConfig[appointment.paymentStatus];

  if (compact) {
    return (
      <div
        className={cn(
          'rounded-md border-l-4 px-2 py-1 text-xs cursor-pointer transition-all hover:shadow-md',
          status.bg,
          status.border
        )}
        title={`${appointment.patientName} - ${appointment.procedure}`}
      >
        <div className="font-medium truncate">{appointment.patientName}</div>
        <div className="text-muted-foreground truncate">{appointment.procedure}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border-l-4 bg-card p-4 shadow-sm transition-all hover:shadow-md',
        status.border
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground truncate">
              {appointment.patientName}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                status.bg,
                status.text
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
              {status.label}
            </span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                payment.class
              )}
            >
              {payment.label}
            </span>
          </div>

          <p className="mt-1 text-sm text-foreground">{appointment.procedure}</p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {appointment.startTime} - {appointment.endTime}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {appointment.professional.name}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {appointment.clinic.name}
            </span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onWhatsApp(appointment)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Enviar WhatsApp
            </DropdownMenuItem>
            {appointment.status === 'pending' && (
              <DropdownMenuItem onClick={() => onConfirm(appointment)}>
                <Check className="mr-2 h-4 w-4" />
                Confirmar
              </DropdownMenuItem>
            )}
            {(appointment.status === 'confirmed' || appointment.status === 'pending') && onComplete && (
              <DropdownMenuItem 
                onClick={() => onComplete(appointment)}
                className="text-emerald-600 focus:text-emerald-600"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Finalizar Atendimento
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onEdit(appointment)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onCancel(appointment)}
              className="text-destructive focus:text-destructive"
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
