import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const ONBOARDING_KEY = 'onboarding_completed_at';

function localStorageKey(userId: string) {
  return `healthcare_onboarding_done_${userId}`;
}

function readLocalCompleted(userId: string | undefined): boolean {
  if (!userId || typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(localStorageKey(userId)) === 'true';
  } catch {
    return false;
  }
}

function writeLocalCompleted(userId: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(localStorageKey(userId), 'true');
  } catch {
    // ignore
  }
}

export function useOnboarding() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const localCompleted = readLocalCompleted(user?.id);

  const { data: completedAt, isLoading } = useQuery({
    queryKey: ['onboarding', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      if (readLocalCompleted(user.id)) return new Date().toISOString();

      const { data, error } = await supabase
        .from('user_preferences')
        .select('preference_value')
        .eq('user_id', user.id)
        .eq('preference_key', ONBOARDING_KEY)
        .maybeSingle();

      if (error) throw error;
      return data?.preference_value || null;
    },
    enabled: !!user?.id,
    retry: false,
    staleTime: 60_000,
  });

  const completeOnboarding = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      writeLocalCompleted(user.id);
      queryClient.setQueryData(['onboarding', user.id], new Date().toISOString());

      try {
        const { error } = await supabase.from('user_preferences').upsert(
          {
            user_id: user.id,
            preference_key: ONBOARDING_KEY,
            preference_value: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,preference_key' }
        );
        if (error) throw error;
      } catch {
        // Tabela ausente ou RLS: localStorage já marcou como concluído
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });

  const hasCompletedOnboarding = localCompleted || !!completedAt;

  return {
    hasCompletedOnboarding,
    isLoading: isLoading && !localCompleted,
    completeOnboarding: completeOnboarding.mutateAsync,
  };
}
