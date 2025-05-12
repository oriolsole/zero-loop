
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

export function createSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  // Initialize Supabase client with service role key for admin access
  return createClient(supabaseUrl, supabaseServiceKey);
}
