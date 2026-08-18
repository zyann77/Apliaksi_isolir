// Fetch & Render Customers
async function loadCustomers() {
    const { data: customers, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    const list = document.getElementById('customer-list');
    list.innerHTML = '';
    
    customers.forEach(cust => {
        let statusColor = cust.isolation_status === 'ISOLATED' ? 'red' : 'green';
        list.innerHTML += `
            <div class="customer-card">
                <div>
                    <h4 style="margin-bottom: 4px;">${cust.name}</h4>
                    <small style="color: gray;">${cust.customer_code} | PPPoE: ${cust.pppoe_username}</small><br>
                    <small style="color: ${statusColor}; font-weight: bold;">● ${cust.isolation_status}</small>
                </div>
                <div style="display: flex; gap: 5px; flex-direction: column;">
                    <button onclick="payCustomer('${cust.id}')" class="btn-primary" style="padding: 6px; font-size: 11px;">Bayar</button>
                    <button onclick="whatsapp('${cust.phone}', '${cust.name}')" style="background: #25D366; color: white; border: none; padding: 6px; border-radius: 6px; font-size: 11px;">WA</button>
                </div>
            </div>
        `;
    });
}

function whatsapp(phone, name) {
    let cleanPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone;
    let text = `Halo ${name},%0ATagihan WiFi Anda belum dibayarkan. Silakan melakukan pembayaran agar layanan tetap aktif.`;
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
}

// Load on start
if (document.getElementById('customer-list')) {
    loadCustomers();
}
