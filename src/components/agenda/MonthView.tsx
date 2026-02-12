import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AgendaAppointment } from '@/types/agenda';

interface MonthViewProps {
  date: Date;
  appointments: AgendaAppointment[];
  onDayClick: (date: Date) => void;
}

const statusColors = {
  confirmed: 'bg-emerald-500',
  pending: 'bg-amber-500',
  return: 'bg-blue-500',
  completed: 'bg-muted-foreground',
  cancelled: 'bg-destructive',
};

export function MonthView({ date, appointments, onDayClick }: MonthViewProps) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const today = new Date();
  const days: Date[] = [];
  let currentDay = calendarStart;

  while (currentDay <= calendarEnd) {
    days.push(currentDay);
    currentDay = addDays(currentDay, 1);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const getAppointmentsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return appointments.filter((apt) => apt.date === dayStr);
  };

  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/50">
        {weekDays.map((day) => (
          <div
            key={day}
            className="border-r border-border p-3 text-center text-sm font-medium text-muted-foreground last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-border last:border-b-0">
            {week.map((day) => {
              const dayAppointments = getAppointmentsForDay(day);
              const isCurrentMonth = isSameMonth(day, date);
              const isToday = isSameDay(day, today);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => onDayClick(day)}
                  className={cn(
                    'min-h-[100px] border-r border-border p-2 transition-colors cursor-pointer last:border-r-0',
                    !isCurrentMonth && 'bg-muted/30 text-muted-foreground',
                    isCurrentMonth && 'bg-card hover:bg-muted/50',
                    isToday && 'bg-primary/5'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm',
                        isToday
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : 'font-medium'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayAppointments.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {dayAppointments.length}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 space-y-1">
                    {dayAppointments.slice(0, 3).map((apt) => (
                      <div
                        key={apt.id}
                        className={cn(
                          'flex items-center gap-1 rounded px-1 py-0.5 text-xs truncate',
                          apt.status === 'confirmed' && 'bg-emerald-100 text-emerald-700',
                          apt.status === 'pending' && 'bg-amber-100 text-amber-700',
                          apt.status === 'return' && 'bg-blue-100 text-blue-700'
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', statusColors[apt.status])} />
                        <span className="truncate">{apt.startTime}</span>
                      </div>
                    ))}
                    {dayAppointments.length > 3 && (
                      <div className="text-xs text-muted-foreground pl-1">
                        +{dayAppointments.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
