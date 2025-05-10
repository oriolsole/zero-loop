
import { createClient } from '@supabase/supabase-js';
import { toast } from '@/components/ui/sonner';

// These would normally be stored in environment variables
// For the purpose of this implementation, we're using placeholders
// that would be replaced with actual values when connecting to Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Check if we have a valid Supabase configuration
export const isSupabaseConfigured = (): boolean => {
  return (
    SUPABASE_URL !== 'https://placeholder.supabase.co' && 
    SUPABASE_ANON_KEY !== 'placeholder-key'
  );
};

// Helper to handle Supabase errors
export const handleSupabaseError = (error: any, defaultMessage: string = 'An error occurred'): void => {
  console.error('Supabase error:', error);
  toast.error(defaultMessage);
};
