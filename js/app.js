// KREDENSIAL SUPABASE BOS
const SUPABASE_URL = 'https://vljvulbjxhuysesronog.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsanZ1bGJqeGh1eXNlc3Jvbm9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMjgyOTcsImV4cCI6MjEwMjYwNDI5N30.yPq1kySc9iPuOdS_eCWGRc60gUoklNqc2YRLQ7ILCIk';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let globalCustomers = [];
let globalPayments = [];
let activeCust = null;

// Jam Realtime
setInterval(() => {
    document.getElementById('realtime-clock').innerText = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'});
}, 1000);

// Auto Login
document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("isLoggedIn") === "true") {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');
        initData();
    }
});

// Sistem Login
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (document.getElementById('username').value === "admin" && document.getElementById('password').value === "1234") {
        localStorage.setItem("isLoggedIn", "true"); 
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');
        initData(); 
    } else {
        document.getElementById('pesan-error').style.display = 'block';
    }
});

// Logout
document.getElementById('btn-logout').addEventListener('click', () => { 
    localStorage.removeItem("isLoggedIn");
    window.location.reload(); 
});

// Pindah Tab & Menu
function switchView(id, btn) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    btn.classList.add('active');
}

function switchTab(id, btn) {
    document.querySelectorAll('.tab-pane').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    btn.classList.add('active');
}

// Modal
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// Init Data
async function initData() {
    await Promise.all([loadCustomers(), loadPayments()]);
    calcDashboard();
}

// Load Pelanggan
async function loadCustomers() {
    let list = document.getElementById('customer-list');
    let { data } = await db.from('customers').select('*').order('created_at', { ascending: false });
    globalCustomers = data || [];
    list.innerHTML = '';
    
    globalCustomers.forEach(cust => {
        let isIso = cust.isolation_status === 'ISOLATED';
        list.innerHTML += `
            <div class="data-card ${isIso ? 'isolated' : ''}" onclick="openDetail('${cust.id}')">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <b style="color:#152238;">${cust.name}</b>
                    <span style="font-size:10px; font-weight:bold; color:${isIso ? 'var(--danger)' : 'var(--success)'};">${isIso ? 'TERISOLIR' : 'AKTIF'}</span>
                </div>
                <div style="font-size:11px; color:#64748b;">User: ${cust.pppoe_username} | Paket: ${cust.packname || '-'}</div>
            </div>`;
    });
}

// Load Bayar
async function loadPayments() {
    let { data } = await db.from('payments').select('*');
    globalPayments = data || [];
}

// Dashboard Angka
function calcDashboard() {
    let tAct = 0, tIso = 0;
    globalCustomers.forEach(c => c.isolation_status === 'ISOLATED' ? tIso++ : tAct++);
    document.getElementById('stat-total').innerText = globalCustomers.length;
    document.getElementById('stat-active').innerText = tAct;
    document.getElementById('stat-isolated').innerText = tIso;

    let currMonth = new Date().getMonth();
    let income = 0;
    globalPayments.forEach(p => { if(new Date(p.created_at).getMonth() === currMonth) income += parseFloat(p.amount); });
    document.getElementById('dashboard-income').innerText = "Rp " + income.toLocaleString('id-ID');
}

// Buka Detail
function openDetail(id) {
    activeCust = globalCustomers.find(c => c.id === id);
    if(!activeCust) return;
    
    // Header Info
    document.getElementById('det-avatar').innerText = activeCust.name.charAt(0).toUpperCase();
    document.getElementById('det-name').innerText = activeCust.name;
    document.getElementById('det-phone').innerText = activeCust.phone || '-';
    document.getElementById('det-id').innerText = "0489" + activeCust.id.substring(0,4).replace(/\D/g,'');
    
    let isIso = activeCust.isolation_status === 'ISOLATED';
    let banner = document.getElementById('det-status-banner');
    banner.className = isIso ? 'status-banner danger' : 'status-banner';
    banner.innerHTML = isIso ? '⚠ TERISOLIR - Harap Lakukan Pembayaran' : '✓ Tidak ada Tagihan';

    // Rincian Data
    document.getElementById('det-reg').innerText = new Date(activeCust.created_at).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'});
    document.getElementById('det-due').innerText = String(activeCust.due_date).padStart(2, '0');
    document.getElementById('det-iso-date').innerText = String(activeCust.due_date).padStart(2, '0');
    
    let harga = activeCust.harga || 0;
    let hargaStr = "Rp. " + harga.toLocaleString('id-ID');
    document.getElementById('det-pack').innerText = activeCust.packname || '-';
    document.getElementById('det-price').innerText = hargaStr;
    document.getElementById('det-total').innerText = hargaStr;
    document.getElementById('det-pppoe').innerText = activeCust.pppoe_username;

    // Tombol Eksekusi
    let btnIso = document.getElementById('btn-det-isolir');
    btnIso.innerText = isIso ? "⚡ BUKA ISOLIR" : "🚫 ISOLIR PELANGGAN";
    btnIso.style.background = isIso ? "var(--success)" : "var(--danger)";
    btnIso.onclick = () => eksekusiMikrotik(activeCust.id, activeCust.pppoe_username, !isIso);

    fetchMikrotikLive();
    renderBulanBayar(hargaStr);

    document.getElementById('detail-screen').classList.add('active');
    document.querySelectorAll('.tab-item')[0].click();
}

function closeDetailScreen() { document.getElementById('detail-screen').classList.remove('active'); activeCust = null;}

// Live Mikrotik
async function fetchMikrotikLive() {
    if(!activeCust) return;
    document.getElementById('det-ip').innerText = "Loading...";
    document.getElementById('det-uptime').innerText = "Loading...";
    
    try {
        let res = await fetch(SUPABASE_URL + '/functions/v1/mikrotik', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY },
            body: JSON.stringify({ pppoe_username: activeCust.pppoe_username, action: 'CHECK_STATUS' })
        });
        let data = await res.json();
        
        if(data.success) {
            document.getElementById('det-ip').innerText = data.ipAddress;
            document.getElementById('det-uptime').innerText = data.isOnline ? data.uptime : "Offline";
            document.getElementById('det-uptime').style.color = data.isOnline ? 'var(--success)' : 'var(--danger)';
        }
    } catch(e) {
        document.getElementById('det-ip').innerText = "-";
        document.getElementById('det-uptime').innerText = "Gagal Konek";
    }
}

// Render Bulan & Bayar
function renderBulanBayar(hargaStr) {
    let custPays = globalPayments.filter(p => p.customer_id === activeCust.id);
    let listBulan = document.getElementById('histori-list');
    listBulan.innerHTML = '';
    
    if(custPays.length === 0) {
        listBulan.innerHTML = '<span style="color:var(--danger); font-size:12px;">Belum ada riwayat pembayaran</span>';
    } else {
        custPays.forEach(p => {
            let d = new Date(p.created_at);
            listBulan.innerHTML += `<div style="background:#f1f5f9; padding:10px; margin-bottom:5px; border-radius:8px; font-size:12px; display:flex; justify-content:space-between;">
                <span>✅ ${d.toLocaleDateString('id-ID', {month:'long', year:'numeric'})}</span>
                <span style="font-weight:bold; color:var(--success);">Lunas</span>
            </div>`;
        });
    }

    let isLunas = custPays.some(p => new Date(p.created_at).getMonth() === new Date().getMonth());
    let invHtml = `
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <b>Bulan ${new Date().toLocaleString('id-ID', {month:'long'})}</b>
            <span style="color:${isLunas ? 'var(--success)' : 'var(--danger)'}; font-weight:bold;">${isLunas ? 'LUNAS' : 'BELUM BAYAR'}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:12px;"><span>Tagihan</span><b>${hargaStr}</b></div>
    `;
    document.getElementById('invoice-current').innerHTML = invHtml;
}

// Pelunasan Otomatis
async function prosesPelunasan() {
    if(!confirm("Proses pelunasan tagihan bulan ini?")) return;
    try {
        await db.from('payments').insert([{ customer_id: activeCust.id, amount: activeCust.harga || 0, payment_method: 'Cash' }]);
        if(activeCust.isolation_status === 'ISOLATED') {
            await eksekusiMikrotik(activeCust.id, activeCust.pppoe_username, false, true); 
        }
        alert("Pelunasan Berhasil!");
        await initData();
        openDetail(activeCust.id); 
    } catch(e) { alert(e.message); }
}

// Edit & Simpan
function openEditModal() {
    document.getElementById('form-title').innerText = "Edit Pelanggan";
    document.getElementById('form-id').value = activeCust.id;
    document.getElementById('cust-name').value = activeCust.name;
    document.getElementById('cust-phone').value = activeCust.phone;
    document.getElementById('cust-package').value = activeCust.packname;
    document.getElementById('cust-price').value = activeCust.harga;
    document.getElementById('cust-user').value = activeCust.pppoe_username;
    document.getElementById('cust-pass').value = activeCust.pppoe_password;
    document.getElementById('cust-due').value = activeCust.due_date;
    openModal('modal-form');
}

document.getElementById('customer-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    let id = document.getElementById('form-id').value;
    let payload = {
        name: document.getElementById('cust-name').value,
        phone: document.getElementById('cust-phone').value,
        packname: document.getElementById('cust-package').value,
        harga: parseInt(document.getElementById('cust-price').value),
        pppoe_username: document.getElementById('cust-user').value,
        pppoe_password: document.getElementById('cust-pass').value,
        due_date: parseInt(document.getElementById('cust-due').value)
    };

    try {
        if(id) {
            await db.from('customers').update(payload).eq('id', id);
        } else {
            payload.isolation_status = 'NORMAL';
            await db.from('customers').insert([payload]);
        }
        document.getElementById('customer-form').reset();
        closeModal('modal-form');
        await initData();
        if(id) openDetail(id);
    } catch(e) { alert(e.message); }
});

// Eksekusi API Mikrotik
async function eksekusiMikrotik(customerId, pppoeUser, makeIsolated, skipAlert=false) {
    let actionText = makeIsolated ? 'ISOLATED' : 'NORMAL';
    try {
        if(!skipAlert) alert("Mengeksekusi MikroTik...");
        await fetch(SUPABASE_URL + '/functions/v1/mikrotik', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY },
            body: JSON.stringify({ pppoe_username: pppoeUser, action: actionText })
        });
        await db.from('customers').update({ isolation_status: actionText }).eq('id', customerId);
        
        if(!skipAlert) alert("Sukses dieksekusi!");
        await initData();
        openDetail(customerId);
    } catch(e) { alert(e.message); }
}
