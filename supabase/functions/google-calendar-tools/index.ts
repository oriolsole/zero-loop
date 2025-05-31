
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple decryption function (matches google-oauth-callback)
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyMaterial = Deno.env.get('GOOGLE_OAUTH_ENCRYPTION_KEY') || 'default-key-material-change-in-production';
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyMaterial.padEnd(32, '0').slice(0, 32));
  
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

async function decryptToken(encryptedToken: string): Promise<string> {
  if (!encryptedToken) return '';
  
  const key = await getEncryptionKey();
  const combined = new Uint8Array(
    atob(encryptedToken).split('').map(char => char.charCodeAt(0))
  );
  
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

async function getGoogleToken(userId: string, supabase: any): Promise<string> {
  const { data, error } = await supabase
    .from('google_oauth_tokens')
    .select('access_token')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new Error('Google OAuth token not found. Please connect your Google account first.');
  }

  return await decryptToken(data.access_token);
}

async function callCalendarAPI(endpoint: string, token: string, options: any = {}) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Calendar API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  console.log('📅 Google Calendar Tools request received');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, ...parameters } = await req.json();
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const googleToken = await getGoogleToken(user.id, supabase);
    let result;

    console.log(`📅 Executing Calendar action: ${action}`);

    switch (action) {
      case 'list_events': {
        const { calendarId = 'primary', maxResults = 10, timeMin, timeMax } = parameters;
        const queryParams = new URLSearchParams({
          maxResults: maxResults.toString(),
          singleEvents: 'true',
          orderBy: 'startTime',
          ...(timeMin && { timeMin }),
          ...(timeMax && { timeMax })
        });
        
        result = await callCalendarAPI(`/calendars/${calendarId}/events?${queryParams}`, googleToken);
        break;
      }

      case 'create_event': {
        const { calendarId = 'primary', summary, description, startTime, endTime, attendees, location } = parameters;
        if (!summary || !startTime || !endTime) {
          throw new Error('Summary, start time, and end time are required');
        }
        
        const eventData = {
          summary,
          description,
          location,
          start: {
            dateTime: startTime,
            timeZone: 'UTC'
          },
          end: {
            dateTime: endTime,
            timeZone: 'UTC'
          },
          ...(attendees && { attendees: attendees.map((email: string) => ({ email })) })
        };
        
        result = await callCalendarAPI(`/calendars/${calendarId}/events`, googleToken, {
          method: 'POST',
          body: eventData
        });
        break;
      }

      case 'update_event': {
        const { calendarId = 'primary', eventId, summary, description, startTime, endTime, attendees, location } = parameters;
        if (!eventId) throw new Error('Event ID is required');
        
        const updateData: any = {};
        if (summary) updateData.summary = summary;
        if (description) updateData.description = description;
        if (location) updateData.location = location;
        if (startTime) updateData.start = { dateTime: startTime, timeZone: 'UTC' };
        if (endTime) updateData.end = { dateTime: endTime, timeZone: 'UTC' };
        if (attendees) updateData.attendees = attendees.map((email: string) => ({ email }));
        
        result = await callCalendarAPI(`/calendars/${calendarId}/events/${eventId}`, googleToken, {
          method: 'PUT',
          body: updateData
        });
        break;
      }

      case 'delete_event': {
        const { calendarId = 'primary', eventId } = parameters;
        if (!eventId) throw new Error('Event ID is required');
        
        result = await callCalendarAPI(`/calendars/${calendarId}/events/${eventId}`, googleToken, {
          method: 'DELETE'
        });
        break;
      }

      case 'get_calendars': {
        result = await callCalendarAPI('/users/me/calendarList', googleToken);
        break;
      }

      case 'get_event': {
        const { calendarId = 'primary', eventId } = parameters;
        if (!eventId) throw new Error('Event ID is required');
        
        result = await callCalendarAPI(`/calendars/${calendarId}/events/${eventId}`, googleToken);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log('✅ Calendar operation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Calendar Tools error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
