
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

/**
 * Get a token for the specified provider from the user's saved tokens
 * @param provider The provider name to get the token for (e.g. 'github', 'openai')
 * @returns The token string or null if not found
 */
export async function getTokenForProvider(provider: string): Promise<string | null> {
  try {
    // Check for active tokens for this provider
    const { data, error } = await supabase
      .from('user_secrets')
      .select('key')
      .eq('provider', provider)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Error fetching token:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      toast.error(`No active ${provider} token found. Please add one in settings.`, {
        description: "You need to provide an API key before using this feature."
      });
      return null;
    }
    
    return data[0].key;
  } catch (e) {
    console.error('Error in getTokenForProvider:', e);
    return null;
  }
}
