/**
 * Envio das confirmações do dia para uma clínica com Suri conectada.
 *
 * Idempotência: cada agendamento ganha uma linha em `appointment_reminders`
 * (UNIQUE appointment_id + provider + reminder_date) ANTES do envio. Quem
 * não consegue inserir/reivindicar a linha não envia.
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { HttpError } from './httpError.ts'
import { readSuriToken, sendSuriTemplate } from './suri.ts'
import {
  buildBodyParameters,
  localNow,
  pickTemplate,
  readSuriConfig,
  REMINDER_ELIGIBLE_STATUSES,
  reminderKind,
  SURI_PROVIDER,
  timeToMinutes,
  toSuriPhone,
} from './suriReminder.ts'

const MAX_ATTEMPTS = 3
const MAX_PER_RUN = 200
const CONCURRENCY = 4

export interface SuriIntegrationRow {
  id: string
  clinic_id: string
  config: Record<string, unknown> | null
  status: string
  is_active: boolean
}

export interface DispatchSummary {
  integration_id: string
  clinic_id: string
  skipped_reason: string | null
  sent: number
  failed: number
  skipped: number
  already_handled: number
}

interface AppointmentRow {
  id: string
  date: string
  start_time: string
  status: string
  procedure: string | null
  procedure_id: string | null
  patient: { name: string | null; phone: string | null } | null
  professional: { name: string | null } | null
}

interface ReminderRow {
  id: string
  appointment_id: string
  status: string
  attempts: number
}

function clinicAddress(clinic: Record<string, unknown>): string {
  const first = [clinic.address, clinic.address_number ? `nº ${clinic.address_number}` : null]
    .filter(Boolean).join(', ')
  const second = [clinic.neighborhood, clinic.city, clinic.state].filter(Boolean).join(' - ')
  return [first, second].filter(Boolean).join(' - ')
}

async function runPool<T>(items: T[], worker: (item: T) => Promise<void>): Promise<void> {
  let index = 0
  const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++]
      await worker(item)
    }
  })
  await Promise.all(runners)
}

export async function dispatchClinicReminders(
  supabase: SupabaseClient,
  integration: SuriIntegrationRow,
  options: { now: Date; manual?: boolean },
): Promise<DispatchSummary> {
  const summary: DispatchSummary = {
    integration_id: integration.id,
    clinic_id: integration.clinic_id,
    skipped_reason: null,
    sent: 0,
    failed: 0,
    skipped: 0,
    already_handled: 0,
  }
  const stop = (reason: string) => ({ ...summary, skipped_reason: reason })

  const config = readSuriConfig(integration.config)
  if (!integration.is_active) return stop('integration_inactive')
  if (!options.manual && !config.reminders_enabled) return stop('reminders_disabled')
  if (!config.endpoint_url) return stop('endpoint_missing')
  if (!config.consultation_template) return stop('template_missing')

  const local = localNow(options.now, config.timezone)
  if (!options.manual && local.hour < config.send_hour) return stop('before_send_hour')

  const token = await readSuriToken(supabase, integration.clinic_id, integration.id)
  if (!token) return stop('token_missing')

  const [{ data: appointments, error: aptError }, { data: clinic, error: clinicError }] =
    await Promise.all([
      supabase
        .from('appointments')
        .select(
          'id, date, start_time, status, procedure, procedure_id, patient:patients(name, phone), professional:professionals(name)',
        )
        .eq('clinic_id', integration.clinic_id)
        .eq('date', local.date)
        .in('status', [...REMINDER_ELIGIBLE_STATUSES])
        .order('start_time', { ascending: true }),
      supabase
        .from('clinics')
        .select('name, phone, address, address_number, neighborhood, city, state')
        .eq('id', integration.clinic_id)
        .maybeSingle(),
    ])
  if (aptError) throw new HttpError(500, 'Falha ao carregar agendamentos')
  if (clinicError || !clinic) throw new HttpError(500, 'Falha ao carregar clínica')

  const upcoming = ((appointments || []) as unknown as AppointmentRow[])
    .filter((apt) => timeToMinutes(apt.start_time) > local.minutes)
    .slice(0, MAX_PER_RUN)
  if (upcoming.length === 0) return summary

  const procedureIds = Array.from(
    new Set(upcoming.map((apt) => apt.procedure_id).filter((id): id is string => Boolean(id))),
  )
  const [{ data: procedures }, { data: existing, error: existingError }] = await Promise.all([
    procedureIds.length > 0
      ? supabase.from('clinic_procedures').select('id, category').in('id', procedureIds)
      : Promise.resolve({ data: [] as { id: string; category: string | null }[] }),
    supabase
      .from('appointment_reminders')
      .select('id, appointment_id, status, attempts')
      .eq('provider', SURI_PROVIDER)
      .eq('reminder_date', local.date)
      .in('appointment_id', upcoming.map((apt) => apt.id)),
  ])
  if (existingError) throw new HttpError(500, 'Falha ao carregar confirmações enviadas')

  const categoryById = new Map(
    ((procedures || []) as { id: string; category: string | null }[]).map((p) => [p.id, p.category]),
  )
  const existingByAppointment = new Map(
    ((existing || []) as ReminderRow[]).map((row) => [row.appointment_id, row]),
  )

  const clinicRecord = clinic as Record<string, unknown>
  const clinicName = String(clinicRecord.name || '')
  const clinicPhone = String(clinicRecord.phone || '')
  const address = clinicAddress(clinicRecord)

  await runPool(upcoming, async (apt) => {
    const kind = reminderKind(apt.procedure_id ? categoryById.get(apt.procedure_id) : null, config.exam_categories)
    const template = pickTemplate(config, kind)
    const phone = toSuriPhone(apt.patient?.phone)

    // Reivindica a linha: só um executor envia por agendamento/dia.
    const previous = existingByAppointment.get(apt.id)
    let reminderId: string | null = null
    if (previous) {
      if (previous.status !== 'failed' || previous.attempts >= MAX_ATTEMPTS) {
        summary.already_handled++
        return
      }
      const { data: claimed } = await supabase
        .from('appointment_reminders')
        .update({ status: 'sending', attempts: previous.attempts + 1, error_message: null })
        .eq('id', previous.id)
        .eq('status', 'failed')
        .select('id')
        .maybeSingle()
      if (!claimed) {
        summary.already_handled++
        return
      }
      reminderId = claimed.id
    } else {
      const skipReason = !phone
        ? 'Paciente sem celular válido'
        : !template?.channel_id
          ? 'Template sem canal WhatsApp'
          : null
      const { data: inserted, error: insertError } = await supabase
        .from('appointment_reminders')
        .insert({
          clinic_id: integration.clinic_id,
          integration_id: integration.id,
          appointment_id: apt.id,
          provider: SURI_PROVIDER,
          reminder_date: local.date,
          kind,
          status: skipReason ? 'skipped' : 'sending',
          patient_phone: phone,
          template_id: template?.template_id ?? null,
          error_message: skipReason,
        })
        .select('id')
        .maybeSingle()
      if (insertError || !inserted) {
        summary.already_handled++
        return
      }
      if (skipReason) {
        summary.skipped++
        return
      }
      reminderId = inserted.id
    }

    if (!phone || !template?.channel_id) {
      await supabase.from('appointment_reminders')
        .update({ status: 'skipped', error_message: 'Paciente sem celular válido ou template sem canal' })
        .eq('id', reminderId)
      summary.skipped++
      return
    }

    try {
      const messageId = await sendSuriTemplate(config.endpoint_url!, token, {
        name: apt.patient?.name || 'Paciente',
        phone,
        channelId: template.channel_id,
        templateId: template.template_id,
        bodyParameters: buildBodyParameters(template.parameters, {
          patientName: apt.patient?.name || '',
          date: apt.date,
          time: apt.start_time,
          professional: apt.professional?.name || '',
          procedure: apt.procedure || '',
          clinicName,
          clinicAddress: address,
          clinicPhone,
        }),
        responseFlowId: config.response_flow_id,
      })
      await supabase.from('appointment_reminders')
        .update({
          status: 'sent',
          external_message_id: messageId || null,
          sent_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', reminderId)
      summary.sent++
    } catch (error) {
      const message = error instanceof HttpError ? error.message : 'Falha inesperada no envio'
      await supabase.from('appointment_reminders')
        .update({ status: 'failed', error_message: message.slice(0, 500) })
        .eq('id', reminderId)
      summary.failed++
    }
  })

  await supabase
    .from('integrations')
    .update({
      last_error: summary.failed > 0 ? `${summary.failed} confirmação(ões) falharam em ${local.date}` : null,
    })
    .eq('id', integration.id)

  return summary
}
