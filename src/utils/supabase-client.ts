
import { createClient } from '@supabase/supabase-js';
import { toast } from '@/components/ui/sonner';
import { supabase as configuredSupabase } from '@/integrations/supabase/client';

// Export the configured supabase client from integrations
export const supabase = configuredSupabase;

// Check if we have a valid Supabase configuration
export const isSupabaseConfigured = (): boolean => {
  return true; // This will always return true now that we're using the configured client
};

// Helper to handle Supabase errors
export const handleSupabaseError = (error: any, defaultMessage: string = 'An error occurred'): void => {
  console.error('Supabase error:', error);
  toast.error(defaultMessage);
};
