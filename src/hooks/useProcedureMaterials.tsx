import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from './useClinic';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type {
  AppointmentMaterialRow,
  AppointmentMaterialUsageInput,
  ClinicProcedureMaterial,
} from '@/types/procedureMaterial';

export function useProcedureMaterials(procedureId?: string | null) {
  const { clinicId } = useClinic();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['procedure-materials', clinicId, procedureId],
    queryFn: async (): Promise<ClinicProcedureMaterial[]> => {
      if (!clinicId || !procedureId) return [];

      const { data: rows, error: queryError } = await (supabase as any)
        .from('clinic_procedure_materials')
        .select(`
          id,
          clinic_id,
          procedure_id,
          product_id,
          default_quantity,
          sort_order,
          product:inventory_products(name, unit, current_stock)
        `)
        .eq('clinic_id', clinicId)
        .eq('procedure_id', procedureId)
        .order('sort_order', { ascending: true });

      if (queryError) {
        if (queryError.code === '42P01') return [];
        throw queryError;
      }

      return ((rows || []) as any[]).map((row) => ({
        id: row.id,
        clinic_id: row.clinic_id,
        procedure_id: row.procedure_id,
        product_id: row.product_id,
        default_quantity: Number(row.default_quantity),
        sort_order: row.sort_order ?? 0,
        product_name: row.product?.name ?? null,
        product_unit: row.product?.unit ?? null,
        current_stock: row.product?.current_stock == null ? null : Number(row.product.current_stock),
      }));
    },
    enabled: !!clinicId && !!procedureId,
  });

  return { materials: data || [], isLoading, error, refetch };
}

export function useAppointmentMaterials(appointmentIds: string[]) {
  const { clinicId } = useClinic();
  const idsKey = appointmentIds.slice().sort().join(',');

  const { data, isLoading } = useQuery({
    queryKey: ['appointment-materials', clinicId, idsKey],
    queryFn: async (): Promise<AppointmentMaterialRow[]> => {
      if (!clinicId || appointmentIds.length === 0) return [];

      const { data: rows, error } = await (supabase as any)
        .from('appointment_materials')
        .select('id, appointment_id, product_id, product_name, product_unit, quantity, overridden, override_reason, created_at')
        .eq('clinic_id', clinicId)
        .in('appointment_id', appointmentIds)
        .order('created_at', { ascending: true });

      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }

      return ((rows || []) as any[]).map((row) => ({
        id: row.id,
        appointment_id: row.appointment_id,
        product_id: row.product_id,
        product_name: row.product_name,
        product_unit: row.product_unit,
        quantity: Number(row.quantity),
        overridden: !!row.overridden,
        override_reason: row.override_reason,
        created_at: row.created_at,
      }));
    },
    enabled: !!clinicId && appointmentIds.length > 0,
  });

  return { materials: data || [], isLoading };
}

export function useProcedureMaterialMutations() {
  const queryClient = useQueryClient();
  const { clinicId } = useClinic();
  const { user } = useAuth();

  const replaceProcedureMaterials = useMutation({
    mutationFn: async ({
      procedureId,
      items,
    }: {
      procedureId: string;
      items: Array<{ productId: string; defaultQuantity: number }>;
    }) => {
      if (!clinicId) throw new Error('Clínica não encontrada');

      const { error: deleteError } = await (supabase as any)
        .from('clinic_procedure_materials')
        .delete()
        .eq('clinic_id', clinicId)
        .eq('procedure_id', procedureId);

      if (deleteError) throw deleteError;

      if (items.length === 0) return [];

      const payload = items.map((item, index) => ({
        clinic_id: clinicId,
        procedure_id: procedureId,
        product_id: item.productId,
        default_quantity: item.defaultQuantity,
        sort_order: index,
      }));

      const { data, error } = await (supabase as any)
        .from('clinic_procedure_materials')
        .insert(payload)
        .select();

      if (error) throw error;
      return data || [];
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['procedure-materials', clinicId, vars.procedureId] });
    },
    onError: (error) => {
      console.error('Error saving procedure materials:', error);
      toast.error('Erro ao salvar materiais do procedimento. Execute o script PRODUCAO_24 no Supabase se ainda não rodou.');
    },
  });

  const recordAppointmentMaterials = useMutation({
    mutationFn: async ({
      appointmentId,
      patientName,
      procedureName,
      items,
    }: {
      appointmentId: string;
      patientName: string;
      procedureName: string;
      items: AppointmentMaterialUsageInput[];
    }) => {
      if (!clinicId) throw new Error('Clínica não encontrada');
      if (!user?.id) throw new Error('Usuário não autenticado');
      if (items.length === 0) return [];

      const { data: existing, error: existingError } = await (supabase as any)
        .from('appointment_materials')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('appointment_id', appointmentId)
        .limit(1);

      if (existingError && existingError.code !== '42P01') throw existingError;
      if (existing && existing.length > 0) {
        return existing;
      }

      const saved: AppointmentMaterialRow[] = [];

      for (const item of items) {
        const { data: product, error: productError } = await (supabase as any)
          .from('inventory_products')
          .select('id, name, unit, current_stock')
          .eq('id', item.productId)
          .eq('clinic_id', clinicId)
          .maybeSingle();

        if (productError) throw productError;
        if (!product) throw new Error(`Produto não encontrado: ${item.productName}`);

        const previousStock = Number(product.current_stock) || 0;
        const newStock = Math.round((previousStock - item.quantity) * 1000) / 1000;
        const movementId = crypto.randomUUID();

        const movementPayload = {
          id: movementId,
          clinic_id: clinicId,
          user_id: user.id,
          product_id: item.productId,
          type: 'saida',
          quantity: item.quantity,
          previous_stock: previousStock,
          new_stock: newStock,
          reason: 'uso',
          notes: [
            `Procedimento: ${procedureName}`,
            `Paciente: ${patientName}`,
            item.overridden ? `Liberado sem saldo${item.overrideReason ? `: ${item.overrideReason}` : ''}` : null,
          ].filter(Boolean).join(' | '),
          appointment_id: appointmentId,
        };

        let { error: movementError } = await (supabase as any)
          .from('inventory_movements')
          .insert(movementPayload);

        if (movementError && ['42703', 'PGRST204'].includes(movementError.code || '')) {
          const { appointment_id: _ignored, ...withoutAppointment } = movementPayload;
          ({ error: movementError } = await (supabase as any)
            .from('inventory_movements')
            .insert(withoutAppointment));
        }

        if (movementError) throw movementError;

        const { error: stockError } = await (supabase as any)
          .from('inventory_products')
          .update({ current_stock: newStock, updated_at: new Date().toISOString() })
          .eq('id', item.productId);

        if (stockError) throw stockError;

        const usageId = crypto.randomUUID();
        const { data: usageRow, error: usageError } = await (supabase as any)
          .from('appointment_materials')
          .insert({
            id: usageId,
            clinic_id: clinicId,
            appointment_id: appointmentId,
            product_id: item.productId,
            product_name: item.productName || product.name,
            product_unit: item.productUnit || product.unit || 'un',
            quantity: item.quantity,
            movement_id: movementId,
            overridden: item.overridden,
            override_reason: item.overrideReason || null,
          })
          .select('id, appointment_id, product_id, product_name, product_unit, quantity, overridden, override_reason, created_at')
          .single();

        if (usageError) throw usageError;

        saved.push({
          id: usageRow.id,
          appointment_id: usageRow.appointment_id,
          product_id: usageRow.product_id,
          product_name: usageRow.product_name,
          product_unit: usageRow.product_unit,
          quantity: Number(usageRow.quantity),
          overridden: !!usageRow.overridden,
          override_reason: usageRow.override_reason,
          created_at: usageRow.created_at,
        });
      }

      // Auditoria: primeiro registro de materiais do atendimento
      try {
        await (supabase as any).from('audit_events').insert({
          clinic_id: clinicId,
          entity_type: 'appointment',
          entity_id: appointmentId,
          action: 'update',
          before: null,
          after: {
            kind: 'appointment_materials',
            procedure: procedureName,
            patient: patientName,
            materials: saved.map((m) => ({
              product_name: m.product_name,
              quantity: m.quantity,
              unit: m.product_unit,
            })),
          },
          reason: 'Materiais confirmados na finalização',
          user_id: user.id,
        });
      } catch (auditErr) {
        console.warn('Falha ao registrar auditoria de materiais:', auditErr);
      }

      return saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-materials'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['procedure-materials'] });
      queryClient.invalidateQueries({ queryKey: ['audit-events'] });
    },
    onError: (error) => {
      console.error('Error recording appointment materials:', error);
      toast.error('Atendimento finalizado, mas falhou ao baixar materiais do estoque. Verifique o script PRODUCAO_24.');
    },
  });

  /**
   * Substitui materiais de um atendimento já finalizado:
   * devolve estoque antigo, baixa o novo e registra auditoria before/after.
   */
  const updateAppointmentMaterials = useMutation({
    mutationFn: async ({
      appointmentId,
      patientName,
      procedureName,
      items,
      reason,
    }: {
      appointmentId: string;
      patientName: string;
      procedureName: string;
      items: AppointmentMaterialUsageInput[];
      reason: string;
    }) => {
      if (!clinicId) throw new Error('Clínica não encontrada');
      if (!user?.id) throw new Error('Usuário não autenticado');
      if (!reason.trim()) throw new Error('Informe o motivo da alteração');

      const { data: existingRows, error: existingError } = await (supabase as any)
        .from('appointment_materials')
        .select('id, product_id, product_name, product_unit, quantity, overridden, override_reason, created_at, appointment_id')
        .eq('clinic_id', clinicId)
        .eq('appointment_id', appointmentId);

      if (existingError) throw existingError;

      const beforeMaterials = ((existingRows || []) as any[]).map((row) => ({
        product_id: row.product_id,
        product_name: row.product_name,
        product_unit: row.product_unit,
        quantity: Number(row.quantity),
      }));

      // Devolve ao estoque o que havia sido baixado
      for (const row of existingRows || []) {
        const qty = Number(row.quantity) || 0;
        if (!(qty > 0)) continue;

        const { data: product, error: productError } = await (supabase as any)
          .from('inventory_products')
          .select('id, current_stock')
          .eq('id', row.product_id)
          .eq('clinic_id', clinicId)
          .maybeSingle();

        if (productError) throw productError;
        if (!product) continue;

        const previousStock = Number(product.current_stock) || 0;
        const newStock = Math.round((previousStock + qty) * 1000) / 1000;

        const { error: movementError } = await (supabase as any)
          .from('inventory_movements')
          .insert({
            id: crypto.randomUUID(),
            clinic_id: clinicId,
            user_id: user.id,
            product_id: row.product_id,
            type: 'entrada',
            quantity: qty,
            previous_stock: previousStock,
            new_stock: newStock,
            reason: 'ajuste',
            notes: `Estorno por edição de materiais | ${procedureName} | ${patientName}`,
            appointment_id: appointmentId,
          });

        if (movementError && !['42703', 'PGRST204'].includes(movementError.code || '')) {
          throw movementError;
        }

        const { error: stockError } = await (supabase as any)
          .from('inventory_products')
          .update({ current_stock: newStock, updated_at: new Date().toISOString() })
          .eq('id', row.product_id);

        if (stockError) throw stockError;
      }

      if ((existingRows || []).length > 0) {
        const { error: deleteError } = await (supabase as any)
          .from('appointment_materials')
          .delete()
          .eq('clinic_id', clinicId)
          .eq('appointment_id', appointmentId);
        if (deleteError) throw deleteError;
      }

      // Reaproveita a lógica de baixa inserindo novamente (sem early-return)
      const saved: AppointmentMaterialRow[] = [];
      for (const item of items) {
        const { data: product, error: productError } = await (supabase as any)
          .from('inventory_products')
          .select('id, name, unit, current_stock')
          .eq('id', item.productId)
          .eq('clinic_id', clinicId)
          .maybeSingle();

        if (productError) throw productError;
        if (!product) throw new Error(`Produto não encontrado: ${item.productName}`);

        const previousStock = Number(product.current_stock) || 0;
        const newStock = Math.round((previousStock - item.quantity) * 1000) / 1000;
        const movementId = crypto.randomUUID();

        let { error: movementError } = await (supabase as any)
          .from('inventory_movements')
          .insert({
            id: movementId,
            clinic_id: clinicId,
            user_id: user.id,
            product_id: item.productId,
            type: 'saida',
            quantity: item.quantity,
            previous_stock: previousStock,
            new_stock: newStock,
            reason: 'uso',
            notes: [
              `Procedimento: ${procedureName}`,
              `Paciente: ${patientName}`,
              `Edição de materiais: ${reason.trim()}`,
              item.overridden ? `Liberado sem saldo${item.overrideReason ? `: ${item.overrideReason}` : ''}` : null,
            ].filter(Boolean).join(' | '),
            appointment_id: appointmentId,
          });

        if (movementError && ['42703', 'PGRST204'].includes(movementError.code || '')) {
          ({ error: movementError } = await (supabase as any)
            .from('inventory_movements')
            .insert({
              id: movementId,
              clinic_id: clinicId,
              user_id: user.id,
              product_id: item.productId,
              type: 'saida',
              quantity: item.quantity,
              previous_stock: previousStock,
              new_stock: newStock,
              reason: 'uso',
              notes: `Edição de materiais: ${reason.trim()}`,
            }));
        }
        if (movementError) throw movementError;

        const { error: stockError } = await (supabase as any)
          .from('inventory_products')
          .update({ current_stock: newStock, updated_at: new Date().toISOString() })
          .eq('id', item.productId);
        if (stockError) throw stockError;

        const { data: usageRow, error: usageError } = await (supabase as any)
          .from('appointment_materials')
          .insert({
            id: crypto.randomUUID(),
            clinic_id: clinicId,
            appointment_id: appointmentId,
            product_id: item.productId,
            product_name: item.productName || product.name,
            product_unit: item.productUnit || product.unit || 'un',
            quantity: item.quantity,
            movement_id: movementId,
            overridden: item.overridden,
            override_reason: item.overrideReason || null,
          })
          .select('id, appointment_id, product_id, product_name, product_unit, quantity, overridden, override_reason, created_at')
          .single();

        if (usageError) throw usageError;

        saved.push({
          id: usageRow.id,
          appointment_id: usageRow.appointment_id,
          product_id: usageRow.product_id,
          product_name: usageRow.product_name,
          product_unit: usageRow.product_unit,
          quantity: Number(usageRow.quantity),
          overridden: !!usageRow.overridden,
          override_reason: usageRow.override_reason,
          created_at: usageRow.created_at,
        });
      }

      const afterMaterials = saved.map((m) => ({
        product_id: m.product_id,
        product_name: m.product_name,
        product_unit: m.product_unit,
        quantity: m.quantity,
      }));

      const { error: auditError } = await (supabase as any).from('audit_events').insert({
        clinic_id: clinicId,
        entity_type: 'appointment',
        entity_id: appointmentId,
        action: 'update',
        before: {
          kind: 'appointment_materials',
          procedure: procedureName,
          patient: patientName,
          materials: beforeMaterials,
        },
        after: {
          kind: 'appointment_materials',
          procedure: procedureName,
          patient: patientName,
          materials: afterMaterials,
        },
        reason: reason.trim(),
        user_id: user.id,
      });

      if (auditError && auditError.code !== '42P01') {
        console.warn('Falha ao registrar auditoria de edição de materiais:', auditError);
      }

      return saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-materials'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['audit-events'] });
      toast.success('Materiais atualizados e registrados na auditoria');
    },
    onError: (error) => {
      console.error('Error updating appointment materials:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar materiais');
    },
  });

  return { replaceProcedureMaterials, recordAppointmentMaterials, updateAppointmentMaterials };
}
