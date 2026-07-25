import { describe, expect, it } from 'vitest';
import {
  formatAppointmentNotificationMessage,
  formatNotificationMessageForDisplay,
} from '@/lib/notificationMessage';

describe('notificationMessage', () => {
  it('monta mensagem com data e hora brasileiras', () => {
    expect(formatAppointmentNotificationMessage('25/07/2026', '09:00')).toBe(
      'Novo agendamento em 25/07/2026 às 09:00',
    );
  });

  it('converte aaaa-mm-dd e HH:mm:ss ao exibir', () => {
    expect(
      formatNotificationMessageForDisplay('Novo agendamento em 2026-07-25 às 09:00:00'),
    ).toBe('Novo agendamento em 25/07/2026 às 09:00');
  });
});
