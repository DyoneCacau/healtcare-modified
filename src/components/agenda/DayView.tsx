import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AppointmentCard } from './AppointmentCard';
import { AgendaAppointment } from '@/types/agenda';

interface DayViewProps {
  date: Date;
  appointments: AgendaAppointment[];
  onEdit: (appointment: AgendaAppointment) => void;
  onCancel: (appointment: AgendaAppointment) => void;
  onConfirm: (appointment: AgendaAppointment) => void;
  onComplete: (appointment: AgendaAppointment) => void;
  onMarkNoShow?: (appointment: AgendaAppointment) => void;
  onWhatsApp: (appointment: AgendaAppointment) => void;
  /** Clique em um horário (slot) para abrir formulário de novo agendamento com essa data e horário */
  onSlotClick?: (startTime: string) => void;
}

const timeSlots = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00',
];

export function DayView({
  date,
  appointments,
  onEdit,
  onCancel,
  onConfirm,
  onComplete,
  onMarkNoShow,
  onWhatsApp,
  onSlotClick,
}: DayViewProps) {
  const sortedSlots = (() => {
    const slotSet = new Set(timeSlots);
    appointments.forEach((apt) => {
      if (apt.startTime) {
        slotSet.add(apt.startTime);
      }
    });
    return Array.from(slotSet).sort((a, b) => a.localeCompare(b));
  })();

  const getAppointmentsForSlot = (slot: string) => {
    return appointments.filter((apt) => apt.startTime === slot);
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-muted/50 px-4 py-3">
        <h3 className="font-semibold text-foreground">
          {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </h3>
        <p className="text-sm text-muted-foreground">
          {appointments.length} agendamento{appointments.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="divide-y divide-border">
        {sortedSlots.map((slot) => {
          const slotAppointments = getAppointmentsForSlot(slot);
          const hasAppointments = slotAppointments.length > 0;

          return (
            <div
              key={slot}
              onClick={() => onSlotClick?.(slot)}
              className={cn(
                'flex min-h-[60px]',
                hasAppointments ? 'bg-card' : 'bg-muted/20',
                onSlotClick && 'cursor-pointer hover:bg-muted/40 transition-colors'
              )}
            >
              <div className="w-20 flex-shrink-0 border-r border-border px-3 py-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {slot}
                </span>
              </div>
              <div className="flex-1 p-2" onClick={(e) => hasAppointments && e.stopPropagation()}>
                {slotAppointments.length > 0 ? (
                  <div className="space-y-2">
                    {slotAppointments.map((apt) => (
                      <AppointmentCard
                        key={apt.id}
                        appointment={apt}
                        onEdit={onEdit}
                        onCancel={onCancel}
                        onConfirm={onConfirm}
                        onComplete={onComplete}
                        onMarkNoShow={onMarkNoShow}
                        onWhatsApp={onWhatsApp}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
