// @deno-types="https://deno.land/std@0.168.0/http/server.ts"
// Supabase Edge Function: dispatch-preview
// Generates preview route lines for selected units before commit
// URL: https://PROJECT.supabase.co/functions/v1/dispatch-preview

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role (bypasses RLS for preview calculation)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Parse request body
    const { incidentId, unitIds } = await req.json()

    if (!incidentId || !unitIds || !Array.isArray(unitIds)) {
      return new Response(
        JSON.stringify({ error: 'Missing incidentId or unitIds array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call RPC function to generate preview routes
    const { data, error } = await supabaseAdmin.rpc('preview_routes', {
      p_incident_id: incidentId,
      p_unit_ids: unitIds
    })

    if (error) {
      console.error('RPC error:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Function error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
