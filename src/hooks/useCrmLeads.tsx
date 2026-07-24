import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from './useClinic';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { CrmLead, CrmLeadInput, CrmLeadStage } from '@/types/crm';
import type { LeadSource } from '@/types/agenda';

type CrmLeadRow = {
  id: string;
  clinic_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  stage: CrmLeadStage;
  lead_source: LeadSource | null;
  referral_name: string | null;
  interest: string | null;
  estimated_value: number | null;
  next_follow_up: string | null;
  notes: string | null;
  owner_user_id: string | null;
  patient_id: string | null;
  appointment_id: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: CrmLeadRow, ownerName?: string | null): CrmLead {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    stage: row.stage,
    leadSource: row.lead_source,
    referralName: row.referral_name,
    interest: row.interest,
    estimatedValue: row.estimated_value == null ? null : Number(row.estimated_value),
    nextFollowUp: row.next_follow_up,
    notes: row.notes,
    ownerUserId: row.owner_user_id,
    ownerName: ownerName ?? null,
    patientId: row.patient_id,
    appointmentId: row.appointment_id,
    lostReason: row.lost_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useCrmLeads() {
  const { clinicId } = useClinic();

  return useQuery({
    queryKey: ['crm-leads', clinicId],
    queryFn: async () => {
      if (!clinicId) return [] as CrmLead[];

      const { data, error } = await supabase
        .from('crm_leads' as any)
        .select('*')
        .eq('clinic_id', clinicId)
        .order('updated_at', { ascending: false });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('crm_leads')) {
          return [] as CrmLead[];
        }
        throw error;
      }

      const rows = (data || []) as unknown as CrmLeadRow[];
      const ownerIds = Array.from(
        new Set(rows.map((r) => r.owner_user_id).filter(Boolean) as string[]),
      );

      let nameMap = new Map<string, string>();
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name')
          .in('user_id', ownerIds);
        nameMap = new Map(
          (profiles || []).map((p: { user_id: string; name: string | null }) => [
            p.user_id,
            p.name || 'Responsável',
          ]),
        );
      }

      return rows.map((row) =>
        mapRow(row, row.owner_user_id ? nameMap.get(row.owner_user_id) : null),
      );
    },
    enabled: !!clinicId,
  });
}

export function useCrmLeadMutations() {
  const { clinicId } = useClinic();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
  };

  const createLead = useMutation({
    mutationFn: async (input: CrmLeadInput) => {
      if (!clinicId || !user?.id) throw new Error('Clínica ou usuário não identificado');

      const { data, error } = await supabase
        .from('crm_leads' as any)
        .insert({
          clinic_id: clinicId,
          name: input.name.trim(),
          phone: input.phone?.trim() || null,
          email: input.email?.trim() || null,
          stage: input.stage || 'new',
          lead_source: input.lead_source ?? null,
          referral_name: input.referral_name?.trim() || null,
          interest: input.interest?.trim() || null,
          estimated_value: input.estimated_value ?? null,
          next_follow_up: input.next_follow_up || null,
          notes: input.notes?.trim() || null,
          owner_user_id: input.owner_user_id || user.id,
          patient_id: input.patient_id ?? null,
          lost_reason: input.lost_reason?.trim() || null,
          created_by: user.id,
        })
        .select('*')
        .single();

      if (error) throw error;
      return mapRow(data as unknown as CrmLeadRow);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Lead criado no CRM');
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || 'Erro ao criar lead. Execute o SQL PRODUCAO_14 no Supabase.');
    },
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, ...input }: CrmLeadInput & { id: string }) => {
      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (input.name != null) payload.name = input.name.trim();
      if (input.phone !== undefined) payload.phone = input.phone?.trim() || null;
      if (input.email !== undefined) payload.email = input.email?.trim() || null;
      if (input.stage !== undefined) payload.stage = input.stage;
      if (input.lead_source !== undefined) payload.lead_source = input.lead_source;
      if (input.referral_name !== undefined) payload.referral_name = input.referral_name?.trim() || null;
      if (input.interest !== undefined) payload.interest = input.interest?.trim() || null;
      if (input.estimated_value !== undefined) payload.estimated_value = input.estimated_value;
      if (input.next_follow_up !== undefined) payload.next_follow_up = input.next_follow_up || null;
      if (input.notes !== undefined) payload.notes = input.notes?.trim() || null;
      if (input.owner_user_id !== undefined) payload.owner_user_id = input.owner_user_id;
      if (input.patient_id !== undefined) payload.patient_id = input.patient_id;
      if (input.lost_reason !== undefined) payload.lost_reason = input.lost_reason?.trim() || null;

      const { data, error } = await supabase
        .from('crm_leads' as any)
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return mapRow(data as unknown as CrmLeadRow);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Lead atualizado');
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || 'Erro ao atualizar lead');
    },
  });

  const moveLeadStage = useMutation({
    mutationFn: async ({ id, stage, lostReason }: { id: string; stage: CrmLeadStage; lostReason?: string }) => {
      const payload: Record<string, unknown> = {
        stage,
        updated_at: new Date().toISOString(),
      };
      if (stage === 'lost') {
        payload.lost_reason = lostReason?.trim() || null;
      } else {
        payload.lost_reason = null;
      }

      const { error } = await supabase
        .from('crm_leads' as any)
        .update(payload)
        .eq('id', id);

      if (error) throw error;
      return { id, stage };
    },
    onSuccess: () => {
      invalidate();
      toast.success('Lead movido de etapa');
    },
    onError: () => toast.error('Erro ao mover lead'),
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_leads' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Lead removido');
    },
    onError: () => toast.error('Erro ao remover lead'),
  });

  return { createLead, updateLead, moveLeadStage, deleteLead };
}
