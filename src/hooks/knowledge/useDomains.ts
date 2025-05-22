
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface Domain {
  id: string;
  name: string;
  short_desc?: string;
}

/**
 * Hook to fetch and manage domains for knowledge storage
 */
export const useDomains = () => {
  const { user, isInitialized } = useAuth();

  const {
    data: domains,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['domains', user?.id],
    queryFn: async (): Promise<Domain[]> => {
      try {
        if (!user) {
          console.log('No user authenticated, cannot fetch domains');
          return [];
        }

        const { data, error } = await supabase
          .from('domains')
          .select('id, name, short_desc')
          .order('name');
          
        if (error) throw error;
        
        return data as Domain[];
      } catch (error) {
        console.error('Error fetching domains:', error);
        toast.error('Failed to load domains');
        return [];
      }
    },
    enabled: !!user && isInitialized, // Only run query when user is authenticated and auth is fully initialized
  });

  return {
    domains: domains || [],
    isLoading,
    error,
    refetch
  };
};

export default useDomains;
