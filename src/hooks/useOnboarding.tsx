import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const ONBOARDING_KEY = 'onboarding_completed_at';

export function useOnboarding() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: completedAt, isLoading, isError } = useQuery({
    queryKey: ['onboarding', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });

  const hasCompletedOnboarding = !!completedAt || isError;

  return {
    hasCompletedOnboarding,
    isLoading,
    completeOnboarding: completeOnboarding.mutateAsync,
  };
}
