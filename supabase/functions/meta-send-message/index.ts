import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_URL') || 'null',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { message_id, conversation_id, body } = await req.json()
    if (!message_id || !conversation_id || !body) {
      return new Response(JSON.stringify({ error: 'Parâmetros inválidos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: conversation, error: conversationError } = await supabase
      .from('chat_conversations')
      .select('*, channel:chat_channels(*)')
      .eq('id', conversation_id)
      .maybeSingle()

    if (conversationError || !conversation) {
      return new Response(JSON.stringify({ error: 'Conversa não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: clinicMembership, error: membershipError } = await supabase
      .from('clinic_users')
      .select('clinic_id')
      .eq('clinic_id', conversation.clinic_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipError || !clinicMembership) {
      console.warn('[SECURITY] User attempted to send to a clinic without membership', {
        userId: user.id,
        clinicId: conversation.clinic_id,
      })
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('id', message_id)
      .eq('conversation_id', conversation.id)
      .eq('clinic_id', conversation.clinic_id)
      .eq('direction', 'outbound')
      .maybeSingle()

    if (messageError || !message) {
      return new Response(JSON.stringify({ error: 'Mensagem não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const channel = conversation.channel as {
      phone_number_id: string | null
      access_token: string | null
      status: string
    } | null

    if (!channel?.access_token || !channel.phone_number_id || channel.status !== 'active') {
      await supabase
        .from('chat_messages')
        .update({ status: 'sent', error_message: 'Canal sem credenciais Meta ativas' })
        .eq('id', message_id)
        .eq('conversation_id', conversation.id)
      return new Response(JSON.stringify({ ok: true, simulated: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const res = await fetch(
      `https://graph.facebook.com/v18.0/${channel.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${channel.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: conversation.contact_phone,
          type: 'text',
          text: { body },
        }),
      }
    )

    const json = await res.json()

    if (!res.ok) {
      console.error('Meta send failed', { status: res.status })
      await supabase
        .from('chat_messages')
        .update({
          status: 'failed',
          error_message: `Falha no provedor Meta (${res.status})`,
        })
        .eq('id', message_id)
        .eq('conversation_id', conversation.id)
      return new Response(JSON.stringify({ error: 'Não foi possível enviar a mensagem' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const externalId = json.messages?.[0]?.id
    await supabase
      .from('chat_messages')
      .update({ status: 'sent', external_id: externalId })
      .eq('id', message_id)
      .eq('conversation_id', conversation.id)

    return new Response(JSON.stringify({ ok: true, external_id: externalId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('meta-send-message error:', err instanceof Error ? err.name : 'unknown')
    return new Response(JSON.stringify({ error: 'Erro interno ao enviar mensagem' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
