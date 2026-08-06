import type { LeadSource } from '@/types/agenda';

/**
 * Reconhece agendamento originado do Smart Hub (booking online).
 * Preferência: booking_idempotency_key (só o booking público grava).
 * Fallback: lead_source smart_hub (valor persistido pela Edge).
 * Aceita smart_hub_booking só como defesa — não é valor do CHECK atual.
 */
export function isSmartHubOriginAppointment(opts: {
  leadSource?: string | LeadSource | null;
  bookingIdempotencyKey?: string | null;
}): boolean {
  const key = opts.bookingIdempotencyKey?.trim();
  if (key) return true;

  const src = String(opts.leadSource || '')
    .trim()
    .toLowerCase();
  return src === 'smart_hub' || src === 'smart_hub_booking';
}

/** @deprecated Prefer isSmartHubOriginAppointment — mantido para imports existentes. */
export function isSmartHubAppointmentSource(
  leadSource: LeadSource | '' | null | undefined
): boolean {
  return isSmartHubOriginAppointment({ leadSource });
}

export const CLINIC_CHANGE_RESET_CONFIRM =
  'Ao alterar a clínica, o profissional e o procedimento selecionados serão redefinidos.';

export const SMART_HUB_CLINIC_HINT =
  'Clínica definida pelo Smart Hub de origem.';

/**
 * Clínica efetiva no save. Quando locked, ignora qualquer clinicId do formulário.
 */
export function resolveClinicIdForSave(opts: {
  clinicLocked: boolean;
  formClinicId: string;
  appointmentClinicId?: string | null;
}): string {
  if (opts.clinicLocked && opts.appointmentClinicId) {
    return opts.appointmentClinicId;
  }
  return opts.formClinicId;
}

/** Troca de clínica: se cancelar a confirmação, não limpa nem troca. */
export function shouldApplyClinicChange(opts: {
  hasDependentSelection: boolean;
  userConfirmed: boolean;
}): boolean {
  if (!opts.hasDependentSelection) return true;
  return opts.userConfirmed;
}

export type AgendaFocusAppointment = {
  id: string;
  date: string;
  clinic: { id: string };
};

export type AgendaFocusResult =
  | { ok: true; appointment: AgendaFocusAppointment }
  | { ok: false; reason: 'missing_id' | 'not_found' | 'forbidden_clinic' };

/**
 * Resolve focus da Agenda com checagem de acesso à clínica do appointment.
 * O clinicId da URL é informativo; a autoridade é o clinic_id do registro
 * e a lista de clínicas acessíveis (já filtrada por RLS/permissão).
 */
export function resolveAgendaFocusTarget(opts: {
  focusAppointmentId: string | null | undefined;
  focusClinicId?: string | null;
  appointments: AgendaFocusAppointment[];
  accessibleClinicIds: string[];
}): AgendaFocusResult {
  const focusId = opts.focusAppointmentId?.trim();
  if (!focusId) return { ok: false, reason: 'missing_id' };

  const appointment = opts.appointments.find((a) => a.id === focusId);
  if (!appointment) return { ok: false, reason: 'not_found' };

  const accessible = new Set(opts.accessibleClinicIds.filter(Boolean));
  if (!accessible.has(appointment.clinic.id)) {
    return { ok: false, reason: 'forbidden_clinic' };
  }

  // Se a URL pede outra clínica, não abre (manipulação).
  const urlClinic = opts.focusClinicId?.trim();
  if (urlClinic && urlClinic !== appointment.clinic.id) {
    return { ok: false, reason: 'forbidden_clinic' };
  }

  return { ok: true, appointment };
}
