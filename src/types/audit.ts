export type AuditEntityType = 'financial' | 'appointment' | 'patient';
export type AuditAction = 'create' | 'update' | 'cancel' | 'delete';

export interface AuditEvent {
  id: string;
  clinic_id: string;
  entity_type: AuditEntityType;
  entity_id: string;
  action: AuditAction;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason?: string | null;
  user_id: string;
  user_name?: string | null;
  user_email?: string | null;
  created_at: string;
}
