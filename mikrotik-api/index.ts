import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Wajib ada CORS agar GitHub Pages (web bos) diizinkan mengambil data dari Supabase
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

    // 1. Setup Supabase Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // 2. Cari data customer dari database
    let customer;
    if (pppoe_username) {
        const { data } = await supabaseClient.from('customers').select('*, packages(ppp_profile)').eq('pppoe_username', pppoe_username).single();
        customer = data;
    } else if (customer_id) {
        const { data } = await supabaseClient.from('customers').select('*, packages(ppp_profile)').eq('id', customer_id).single();
        customer = data;
    }

    if (!customer) throw new Error("Data Pelanggan tidak ditemukan di database");

    // 3. Cari data router
    const { data: router } = await supabaseClient.from('routers').select('*').eq('id', customer.router_id).single();
    if (!router) throw new Error("Router MikroTik tidak ditemukan");

    const authHeader = "Basic " + btoa(`${router.username}:${router.secret_reference}`);

    // ==========================================
    // 🚀 LOGIKA 1: CEK STATUS (UPTIME, REMOTE, LOGOUT)
    // ==========================================
    if (action === 'STATUS') {
        const activeUrl = `http://${router.host}/rest/ppp/active?name=${customer.pppoe_username}`;
        const activeRes = await fetch(activeUrl, { headers: { 'Authorization': authHeader } });
        const activeData = activeRes.ok ? await activeRes.json() : [];

        const secretUrl = `http://${router.host}/rest/ppp/secret?name=${customer.pppoe_username}`;
        const secretRes = await fetch(secretUrl, { headers: { 'Authorization': authHeader } });
        const secretData = secretRes.ok ? await secretRes.json() : [];

        let uptime = "";
        let remote_address = "";
        let last_logout = "";

        if (activeData && activeData.length > 0) {
            uptime = activeData[0].uptime || "";
            remote_address = activeData[0].address || ""; 
        }
        if (secretData && secretData.length > 0) {
            last_logout = secretData[0]['last-logged-out'] || "-";
        }

        return new Response(JSON.stringify({
            uptime: uptime,
            remote_address: remote_address,
            last_logout: last_logout
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ==========================================
    // ⚡ LOGIKA 2: EKSEKUSI ISOLIR / UNISOLIR
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
      body: JSON.stringify({ profile: targetProfile })
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
