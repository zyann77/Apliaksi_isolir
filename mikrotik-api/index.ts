import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { customer_id, action, router_id } = await req.json() // action: 'ISOLATE' atau 'UNISOLATE'

    // 1. Setup Supabase Client untuk ambil data router & customer
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // 2. Ambil credential Router & Data Customer PPPoE
    const { data: customer } = await supabaseClient.from('customers').select('*').eq('id', customer_id).single();
    const { data: router } = await supabaseClient.from('routers').select('*').eq('id', router_id).single();
    
    // Asumsi menggunakan RouterOS v7.1+ REST API (Sangat ringan & cocok dengan Serverless)
    // URL format: https://[ROUTER_IP]/rest/ppp/secret
    const mktUrl = `http://${router.host}/rest/ppp/secret/${customer.pppoe_username}`;
    
    // MikroTik Basic Auth
    const authHeader = "Basic " + btoa(`${router.username}:${router.secret_reference}`);
    
    // 3. Tentukan profile MikroTik berdasarkan Action
    const targetProfile = action === 'ISOLATE' ? 'ISOLIR' : 'DEFAULT_PROFILE'; // Sesuaikan

    const mktResponse = await fetch(mktUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ profile: targetProfile })
    });

    if (mktResponse.ok) {
        // Update database Supabase status pelanggan
        await supabaseClient.from('customers').update({ 
            isolation_status: action === 'ISOLATE' ? 'ISOLATED' : 'NORMAL' 
        }).eq('id', customer_id);

        return new Response(JSON.stringify({ success: true, message: `Berhasil ${action} di MikroTik` }), {
            headers: { "Content-Type": "application/json" },
        })
    } else {
        throw new Error("Gagal menghubungi MikroTik API");
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    })
  }
})
