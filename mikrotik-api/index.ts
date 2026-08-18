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
    const body = await req.json()
    const action = body.action; 
    const pppoe_username = body.pppoe_username;
    const customer_id = body.customer_id;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    let customer;
    if (pppoe_username) {
        const { data } = await supabaseClient.from('customers').select('*, packages(ppp_profile)').eq('pppoe_username', pppoe_username).single();
        customer = data;
    } else if (customer_id) {
        const { data } = await supabaseClient.from('customers').select('*, packages(ppp_profile)').eq('id', customer_id).single();
        customer = data;
    }

    if (!customer) throw new Error("Data Pelanggan tidak ditemukan di database");

    const { data: router } = await supabaseClient.from('routers').select('*').eq('id', customer.router_id).single();
    if (!router) throw new Error("Router MikroTik tidak ditemukan");

    const authHeader = "Basic " + btoa(`${router.username}:${router.secret_reference}`);

    // ==========================================
    // ⚡ LOGIKA EKSEKUSI ISOLIR / UNISOLIR
    // ==========================================
    const isIsolate = action === 'ISOLATE' || action === 'ISOLATED';
    const targetProfile = isIsolate ? 'ISOLIR' : (customer.packages?.ppp_profile || 'default');
    
    const mktUrl = `http://${router.host}/rest/ppp/secret/${customer.pppoe_username}`;
    
    const mktResponse = await fetch(mktUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      // 🚀 TAMBAHAN: Mengosongkan komentar yang tadinya ada tulisan ",,, Normal"
      body: JSON.stringify({ 
          profile: targetProfile,
          comment: "" 
      })
    });

    if (mktResponse.ok) {
        try {
            const activeCheckUrl = `http://${router.host}/rest/ppp/active?name=${customer.pppoe_username}`;
            const activeCheckRes = await fetch(activeCheckUrl, { headers: { 'Authorization': authHeader } });
            const activeConns = activeCheckRes.ok ? await activeCheckRes.json() : [];
            
            if (activeConns.length > 0) {
                const activeId = activeConns[0]['.id'];
                await fetch(`http://${router.host}/rest/ppp/active/${activeId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': authHeader }
                });
            }
        } catch (e) {
            console.log("Gagal menendang koneksi aktif, abaikan...");
        }

        return new Response(JSON.stringify({ success: true, message: `Berhasil ${action} di MikroTik` }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
    } else {
        const errMsg = await mktResponse.text();
        throw new Error(`Gagal menghubungi MikroTik: ${errMsg}`);
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
