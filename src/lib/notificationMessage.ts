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
 * Corrige datas aaaa-mm-dd (e horários HH:mm:ss) em mensagens já salvas.
 */
export function formatNotificationMessageForDisplay(message: string): string {
  return message
    .replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, '$3/$2/$1')
    .replace(/\b(\d{2}:\d{2}):\d{2}\b/g, '$1');
}
