const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_URL') || 'null',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.warn('[SECURITY] Blocked call to deprecated create-clinic-on-signup function')
  return new Response(
    JSON.stringify({
      error: 'Gone',
      message: 'Automatic clinic creation on signup is disabled.',
    }),
    {
      status: 410,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    }
  )
})
