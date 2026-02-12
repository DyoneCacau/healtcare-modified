import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AgendaAppointment } from '@/types/agenda';
import { AppointmentCard } from './AppointmentCard';

interface WeekViewProps {
  date: Date;
  appointments: AgendaAppointment[];
  onEdit: (appointment: AgendaAppointment) => void;
  onCancel: (appointment: AgendaAppointment) => void;
  onConfirm: (appointment: AgendaAppointment) => void;
  onComplete: (appointment: AgendaAppointment) => void;
  onWhatsApp: (appointment: AgendaAppointment) => void;
}

const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
];

export function WeekView({
  date,
  appointments,
  onEdit,
  onCancel,
  onConfirm,
  onComplete,
  onWhatsApp,
}: WeekViewProps) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const getAppointmentsForDayAndSlot = (day: Date, slot: string) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return appointments.filter(
      (apt) => apt.date === dayStr && apt.startTime === slot
    );
  };

  const getAppointmentsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return appointments.filter((apt) => apt.date === dayStr);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header with days */}
      <div className="grid grid-cols-8 border-b border-border bg-muted/50">
        <div className="w-20 border-r border-border p-2" />
        {weekDays.map((day) => {
          const isToday = isSameDay(day, today);
          const dayAppointments = getAppointmentsForDay(day);
          
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'border-r border-border p-2 text-center last:border-r-0',
                isToday && 'bg-primary/5'
              )}
            >
              <div className="text-xs uppercase text-muted-foreground">
                {format(day, 'EEE', { locale: ptBR })}
              </div>
              <div
                className={cn(
                  'mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                  isToday
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground'
                )}
              >
                {format(day, 'd')}
              </div>
              {dayAppointments.length > 0 && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {dayAppointments.length} agend.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Time slots grid */}
      <div className="max-h-[600px] overflow-y-auto">
        {timeSlots.map((slot) => (
          <div key={slot} className="grid grid-cols-8 border-b border-border last:border-b-0">
            <div className="w-20 border-r border-border px-2 py-3">
              <span className="text-xs font-medium text-muted-foreground">
                {slot}
              </span>
            </div>
            {weekDays.map((day) => {
              const slotAppointments = getAppointmentsForDayAndSlot(day, slot);
              const isToday = isSameDay(day, today);

              return (
                <div
                  key={`${day.toISOString()}-${slot}`}
                  className={cn(
                    'min-h-[80px] border-r border-border p-1 last:border-r-0',
                    isToday ? 'bg-primary/5' : 'bg-card',
                    slotAppointments.length === 0 && 'hover:bg-muted/50'
                  )}
                >
                  {slotAppointments.map((apt) => (
                    <AppointmentCard
                      key={apt.id}
                      appointment={apt}
                      onEdit={onEdit}
                      onCancel={onCancel}
                      onConfirm={onConfirm}
                      onComplete={onComplete}
                      onWhatsApp={onWhatsApp}
                      compact
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
