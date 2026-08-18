// Supabase Edge Function: Mengirim perintah Isolir ke MikroTik
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { customerId, action } = await req.json()
    
    // Inisialisasi Supabase Client dengan Service Role Key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Dapatkan data pelanggan & router (Logika DB)
    const { data: customer } = await supabaseClient
      .from('customers')
      .select('*, routers(*)')
      .eq('id', customerId)
      .single()

    if (!customer) throw new Error("Client not found")

    // Kredensial MikroTik diambil dari Supabase Vault/Environment, BUKAN frontend
    const mkUser = customer.routers.username;
    const mkPass = Deno.env.get(`ROUTER_SECRET_${customer.routers.secret_reference}`);
    const mkHost = customer.routers.host;

    // Menggunakan RouterOS v7 REST API (HTTPS)
    // Endpoint untuk mengubah profile PPPoE user menjadi "ISOLIR"
    const mkEndpoint = `https://${mkHost}/rest/ppp/secret/${customer.pppoe_username}`;
    
    const profile = action === 'ISOLATE' ? 'ISOLIR' : customer.package_name;

    const response = await fetch(mkEndpoint, {
      method: 'PATCH',
      headers: {
        'Authorization': 'Basic ' + btoa(`${mkUser}:${mkPass}`),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ profile: profile })
    });

    if (!response.ok) throw new Error("MikroTik API Failed");

    // Catat log di database & Update status
    await supabaseClient.from('customers').update({ 
      isolation_status: action === 'ISOLATE',
      connection_status: action === 'ISOLATE' ? 'ISOLATED' : 'ACTIVE'
    }).eq('id', customerId);

    return new Response(JSON.stringify({ status: "SUCCESS", message: `Client ${action}D` }), {
      headers: { "Content-Type": "application/json" },
    })
    
  } catch (error) {
    return new Response(JSON.stringify({ status: "ERROR", message: error.message }), { status: 400 })
  }
})
