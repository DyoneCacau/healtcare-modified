/**
 * Mensagem padrão de novo agendamento (data já em dd/MM/yyyy).
 */
export function formatAppointmentNotificationMessage(dateLabel: string, timeLabel: string): string {
  if (dateLabel && timeLabel) return `Novo agendamento em ${dateLabel} às ${timeLabel}`;
  if (dateLabel) return `Novo agendamento em ${dateLabel}`;
  if (timeLabel) return `Novo agendamento às ${timeLabel}`;
  return 'Novo agendamento';
}

/**
 * Mensagem do booking público Smart Hub.
 * Ex.: "Maria agendou Limpeza com Ana para 10/08/2026 às 14:00."
 */
export function formatSmartHubBookingNotificationMessage(params: {
  patientName: string;
  procedureName: string;
  professionalName: string;
  dateLabel: string;
  timeLabel: string;
}): string {
  const patient = params.patientName.trim() || 'Paciente';
  const procedure = params.procedureName.trim() || 'procedimento';
  const professional = params.professionalName.trim() || 'profissional';
  const date = params.dateLabel.trim();
  const time = params.timeLabel.trim().slice(0, 5);
  if (date && time) {
    return `${patient} agendou ${procedure} com ${professional} para ${date} às ${time}.`;
  }
  if (date) {
    return `${patient} agendou ${procedure} com ${professional} para ${date}.`;
  }
  return `${patient} agendou ${procedure} com ${professional}.`;
}

export const SMART_HUB_BOOKING_NOTIFICATION_TITLE = 'Novo agendamento online';

/** Deep link da Agenda para abrir o appointment. */
export function buildAgendaFocusPath(appointmentId: string, clinicId?: string | null): string {
  const params = new URLSearchParams();
  params.set('focusAppointmentId', appointmentId);
  if (clinicId) params.set('clinicId', clinicId);
  return `/agenda?${params.toString()}`;
}

/**
 * Corrige datas aaaa-mm-dd (e horários HH:mm:ss) em mensagens já salvas.
 */
export function formatNotificationMessageForDisplay(message: string): string {
  return message
    .replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, '$3/$2/$1')
    .replace(/\b(\d{2}:\d{2}):\d{2}\b/g, '$1');
}
