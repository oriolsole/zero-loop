
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 exec-sql function called');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { query, params } = await req.json()
    
    console.log('📝 Query:', query);
    console.log('📋 Params:', params);

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // For simple SELECT queries, use the from() method
    if (query.trim().toLowerCase().startsWith('select') && query.includes('agent_sessions')) {
      const { data, error } = await supabaseClient
        .from('agent_sessions')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ Database error:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      console.log('✅ Query successful, rows:', data?.length);
      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For other queries, try to execute them directly
    try {
      const { data, error } = await supabaseClient.rpc('exec_query', {
        query_text: query,
        query_params: params || []
      })

      if (error) {
        console.error('❌ RPC error:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      console.log('✅ RPC query successful');
      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (rpcError) {
      console.warn('⚠️ RPC failed, falling back to basic operations');
      
      // Fallback: return empty data for session queries
      if (query.includes('agent_sessions')) {
        return new Response(
          JSON.stringify({ data: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      throw rpcError;
    }

  } catch (error) {
    console.error('❌ exec-sql error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
