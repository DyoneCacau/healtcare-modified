import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from './useClinic';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface InventoryProductData {
  id: string;
  clinic_id: string;
  name: string;
  sku: string | null;
  description: string | null;
  category: string | null;
  current_stock: number;
  minimum_stock: number | null;
  cost_price: number | null;
  sale_price: number | null;
  unit: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovementData {
  id: string;
  clinic_id: string;
  product_id: string;
  user_id: string;
  type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  notes: string | null;
  created_at: string;
}

export function useInventoryProducts() {
  const { clinicId } = useClinic();

  const { data: products, isLoading, error, refetch } = useQuery({
    queryKey: ['inventory-products', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];

      const { data, error } = await supabase
        .from('inventory_products')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicId,
  });

  return { 
    products: products || [], 
    activeProducts: (products || []).filter(p => p.is_active),
    isLoading, 
    error,
    refetch 
  };
}

export function useInventoryMovements() {
  const { clinicId } = useClinic();

  const { data: movements, isLoading, error, refetch } = useQuery({
    queryKey: ['inventory-movements', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];

      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
          *,
          product:inventory_products(name)
        `)
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicId,
  });

  return { 
    movements: movements || [], 
    isLoading, 
    error,
    refetch 
  };
}

export function useInventoryMutations() {
  const queryClient = useQueryClient();
  const { clinicId } = useClinic();
  const { user } = useAuth();

  const createProduct = useMutation({
    mutationFn: async (data: Omit<InventoryProductData, 'id' | 'clinic_id' | 'created_at' | 'updated_at'>) => {
      if (!clinicId) throw new Error('Clínica não encontrada');

      const { data: product, error } = await supabase
        .from('inventory_products')
        .insert({
          ...data,
          clinic_id: clinicId,
        })
        .select()
        .single();

      if (error) throw error;
      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      toast.success('Produto cadastrado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating product:', error);
      toast.error('Erro ao cadastrar produto');
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...data }: Partial<InventoryProductData> & { id: string }) => {
      const { data: product, error } = await supabase
        .from('inventory_products')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      toast.success('Produto atualizado!');
    },
    onError: (error) => {
      console.error('Error updating product:', error);
      toast.error('Erro ao atualizar produto');
    },
  });

  const createMovement = useMutation({
    mutationFn: async (data: {
      product_id: string;
      type: 'entrada' | 'saida';
      quantity: number;
      previous_stock: number;
      new_stock: number;
      reason: string;
      notes?: string;
    }) => {
      if (!clinicId) throw new Error('Clínica não encontrada');
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Create movement
      const { data: movement, error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          clinic_id: clinicId,
          user_id: user.id,
          product_id: data.product_id,
          type: data.type,
          quantity: data.quantity,
          previous_stock: data.previous_stock,
          new_stock: data.new_stock,
          reason: data.reason,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (movementError) throw movementError;

      // Update product stock
      const { error: updateError } = await supabase
        .from('inventory_products')
        .update({ current_stock: data.new_stock })
        .eq('id', data.product_id);

      if (updateError) throw updateError;

      return movement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      toast.success('Movimentação registrada!');
    },
    onError: (error) => {
      console.error('Error creating movement:', error);
      toast.error('Erro ao registrar movimentação');
    },
  });

  return { createProduct, updateProduct, createMovement };
}
