
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";
import { generateSystemPrompt } from '../ai-agent/system-prompts.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { customPrompt, loopEnabled, loopIteration } = await req.json();

    // Get available tools (MCPs)
    const { data: mcps, error: mcpError } = await supabaseClient
      .from('mcps')
      .select('*')
      .eq('isDefault', true)
      .in('default_key', ['web-search', 'github-tools', 'knowledge-search', 'jira-tools', 'web-scraper']);

    if (mcpError) {
      throw new Error('Failed to fetch available tools');
    }

    let systemPrompt;
    
    if (customPrompt && customPrompt.trim()) {
      // Use custom prompt if provided and not empty
      systemPrompt = customPrompt;
    } else {
      // Generate default system prompt
      systemPrompt = generateSystemPrompt(mcps || [], [], loopIteration || 0);
    }

    return new Response(
      JSON.stringify({ 
        systemPrompt,
        toolsCount: mcps?.length || 0,
        usedCustomPrompt: !!(customPrompt && customPrompt.trim())
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating system prompt:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
