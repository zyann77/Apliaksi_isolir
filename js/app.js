// INIT SUPABASE
const SUPABASE_URL = 'https://vljvulbjxhuysesronog.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsanZ1bGJqeGh1eXNlc3Jvbm9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMjgyOTcsImV4cCI6MjEwMjYwNDI5N30.yPq1kySc9iPuOdS_eCWGRc60gUoklNqc2YRLQ7ILCIk';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let globalCustomers = [];
let globalPayments = [];
let activeCust = null;
let currentBillingFilter = 'semua';

// AUTO LOGIN & AUTH
document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("isLoggedIn") === "true") {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');
        initData();
    }
});

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

document.getElementById('btn-logout').addEventListener('click', () => { 
    localStorage.removeItem("isLoggedIn");
    window.location.reload(); 
});

// UI NAVIGATION
function switchView(id, btn) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    btn.classList.add('active');
    closeFab();
}

function switchSheetTab(id, btn) {
    document.querySelectorAll('.s-pane').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.s-tab').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    btn.classList.add('active');
}

function toggleFab() {
    document.getElementById('fab-main').classList.toggle('open');
    document.getElementById('fab-options').classList.toggle('open');
}
function closeFab() {
    document.getElementById('fab-main').classList.remove('open');
    document.getElementById('fab-options').classList.remove('open');
}

function openModal(id) { document.getElementById(id).classList.add('active'); closeFab(); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// DATA INITIALIZATION
async function initData() {
    try {
        await Promise.all([loadCustomers(), loadPayments()]);
        calcDashboard();
    } catch(e) {
        console.error("Error Initialize Data:", e);
    }
}

const formatRp = (angka) => "Rp " + (Number(angka) || 0).toLocaleString('id-ID');

async function loadCustomers() {
    let { data, error } = await db.from('customers').select('*').order('created_at', { ascending: false });
    if(error) console.error("Load Customers Error:", error);
    globalCustomers = data || [];
    renderCustomerList(globalCustomers);
}

async function loadPayments() {
    let { data, error } = await db.from('payments').select('*');
    if(error) console.error("Load Payments Error:", error);
    globalPayments = data || [];
}

// RENDER CUSTOMERS
function renderCustomerList(data) {
    let list = document.getElementById('customer-list');
    list.innerHTML = '';
    data.forEach(cust => {
        let isIso = cust.isolation_status === 'ISOLATED';
        
        // PENCEGAH ERROR NAMA KOSONG
        let safeName = String(cust.name || 'User');
        let avatar = safeName.charAt(0).toUpperCase();
        if(safeName.length > 1) avatar += safeName.charAt(1).toUpperCase();
        
        list.innerHTML += `
            <div class="cust-card" onclick="openDetail('${cust.id}')">
                <div class="cc-top">
                    <div style="display:flex;">
                        <div class="cc-avatar">${avatar}</div>
                        <div>
                            <div class="cc-name">${safeName}</div>
                            <div class="cc-sub">WA ${cust.phone || '-'}</div>
                        </div>
                    </div>
                    <div class="id-badge ${isIso ? 'isolated' : ''}">● ${isIso ? 'ISOLATED' : 'AKTIF'}</div>
                </div>
                <div class="cc-mid">
                    <span class="cc-pack">${cust.packname || '-'}</span>
                    <span class="cc-price">${formatRp(cust.harga)} / bln</span>
                </div>
                <div class="cc-bot">
                    <span>Jatuh tempo:</span>
                    <span style="color:var(--navy);">Tgl ${cust.due_date || '-'}</span>
                </div>
            </div>`;
    });
}

// DASHBOARD CALCULATIONS
function calcDashboard() {
    let tAct = 0, tIso = 0, outstanding = 0, unpaidCount = 0;
    let currMonth = new Date().getMonth();
    
    globalCustomers.forEach(c => {
        c.isolation_status === 'ISOLATED' ? tIso++ : tAct++;
        let hasPaid = globalPayments.some(p => p.customer_id === c.id && new Date(p.created_at).getMonth() === currMonth);
        if(!hasPaid) { outstanding += (Number(c.harga) || 0); unpaidCount++; }
    });
    
    let income = 0, incomeToday = 0;
    let today = new Date().getDate();
    globalPayments.forEach(p => { 
        let pd = new Date(p.created_at);
        if(pd.getMonth() === currMonth) income += parseFloat(p.amount); 
        if(pd.getDate() === today && pd.getMonth() === currMonth) incomeToday += parseFloat(p.amount);
    });

    document.getElementById('dash-income').innerText = formatRp(income);
    document.getElementById('dash-income-today').innerText = formatRp(incomeToday);
    document.getElementById('dash-outstanding').innerText = formatRp(outstanding);
    document.getElementById('s-total').innerText = globalCustomers.length;
    document.getElementById('s-online').innerText = tAct;
    document.getElementById('s-iso').innerText = tIso;

    document.getElementById('bill-outstanding').innerText = formatRp(outstanding);
    document.getElementById('bill-unpaid-count').innerText = unpaidCount;
    renderInvoiceList();
}

// BILLING FILTER
function filterBilling(type, el) {
    currentBillingFilter = type;
    if(el) {
        document.querySelectorAll('#view-billing .chip').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        if(type === 'hari-ini') {
            el.style.background = "var(--danger)";
            el.style.color = "white";
        } else {
            document.querySelectorAll('#view-billing .chip')[1].style.background = "var(--danger-light)";
            document.querySelectorAll('#view-billing .chip')[1].style.color = "var(--danger)";
        }
    }
    renderInvoiceList();
}

function renderInvoiceList() {
    let list = document.getElementById('invoice-list');
    list.innerHTML = '';
    let currMonth = new Date().getMonth();
    let today = new Date().getDate();
    let countToday = 0;

    globalCustomers.forEach(cust => {
        let hasPaid = globalPayments.some(p => p.customer_id === cust.id && new Date(p.created_at).getMonth() === currMonth);
        if(hasPaid) return; 
        
        let dueDateNum = Number(cust.due_date);
        if(dueDateNum === today) countToday++;
        if(currentBillingFilter === 'hari-ini' && dueDateNum !== today) return;

        let curBulanStr = new Date().toLocaleString('id-ID', {month:'long', year:'numeric'});
        
        // PENCEGAH ERROR SUBSTRING JIKA ID ADALAH ANGKA BUKAN STRING
        let safeIdStr = String(cust.id || "0000").substring(0,4).toUpperCase();
        let invNo = "INV-" + new Date().getFullYear() + String(currMonth + 1).padStart(2,'0') + "-" + safeIdStr;
        
        let waMsg = `Halo *${cust.name || 'Pelanggan'}*,\n\nTagihan internet *${cust.packname || '-'}* Anda untuk periode *${curBulanStr}* telah terbit.\n\n💰 *Total: ${formatRp(cust.harga)}*\n📅 Jatuh tempo: tgl *${cust.due_date || '-'}*\nNo. Invoice: *${invNo}*\n\nSilakan lakukan pembayaran sebelum tanggal jatuh tempo untuk menghindari pemutusan layanan.\n\nTerima kasih 🙏`;

        list.innerHTML += `
            <div class="cust-card">
                <div class="cc-top" style="margin-bottom:5px;">
                    <div class="cc-name" onclick="openDetail('${cust.id}')">${cust.name || 'User'}</div>
                    <div style="font-size:11px; font-weight:800; color:var(--danger);">● BELUM BAYAR</div>
                </div>
                <div style="font-size:12px; color:var(--text-muted); font-weight:600; margin-bottom:12px;">${cust.packname || '-'} — ${formatRp(cust.harga)}</div>
                <div class="cc-bot">
                    <span style="color:var(--navy); font-size:13px;">Tgl ${cust.due_date || '-'}</span>
                    <a href="https://wa.me/${cust.phone || ''}?text=${encodeURIComponent(waMsg)}" target="_blank" style="text-decoration:none;">
                        <button class="btn-sm" style="background:#25D366; color:white; border:none; box-shadow:0 4px 10px rgba(37,211,102,0.3);">💬 Tagih WA</button>
                    </a>
                </div>
            </div>`;
    });
    document.getElementById('count-today').innerText = countToday;
}

// OPEN BOTTOM SHEET DETAIL (DUA SLIDE TABS)
function openDetail(id) {
    activeCust = globalCustomers.find(c => String(c.id) === String(id));
    if(!activeCust) return;
    
    let isIso = activeCust.isolation_status === 'ISOLATED';
    let safeName = String(activeCust.name || 'User');
    
    // Header
    document.getElementById('det-name').innerText = safeName;
    document.getElementById('det-avatar').innerText = safeName.charAt(0).toUpperCase();
    document.getElementById('det-status-badge').innerText = isIso ? "ISOLATED" : "ONLINE";
    document.getElementById('det-status-badge').className = isIso ? "id-badge isolated" : "id-badge";

    // Slide 1: Info Profile
    document.getElementById('det-pppoe').innerText = activeCust.pppoe_username || '-';
    let regDate = activeCust.created_at ? new Date(activeCust.created_at).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) : '-';
    document.getElementById('det-reg').innerText = regDate;
    document.getElementById('det-due').innerText = activeCust.due_date || '0';
    document.getElementById('det-address').innerText = activeCust.address || "Belum ada data alamat.";
    document.getElementById('det-pack').innerText = activeCust.packname || '-';
    document.getElementById('det-price').innerText = formatRp(activeCust.harga);

    let btnAct = document.getElementById('btn-det-action');
    if(isIso) {
        btnAct.innerText = "ACTIVATE INTERNET";
        btnAct.style.background = "var(--navy)";
        btnAct.onclick = () => eksekusiMikrotik(activeCust.id, activeCust.pppoe_username, false);
    } else {
        btnAct.innerText = "ISOLIR PELANGGAN";
        btnAct.style.background = "var(--danger)";
        btnAct.onclick = () => eksekusiMikrotik(activeCust.id, activeCust.pppoe_username, true);
    }

    // Slide 2: WA Preview Generation
    let curBulanStr = new Date().toLocaleString('id-ID', {month:'long', year:'numeric'});
    let safeIdStr2 = String(activeCust.id || "0000").substring(0,4).toUpperCase();
    let invNo = "INV-" + new Date().getFullYear() + String(new Date().getMonth()+1).padStart(2,'0') + "-" + safeIdStr2;
    
    let invMsg = `Halo *${safeName}*,\n\nTagihan internet *${activeCust.packname || '-'}* Anda untuk periode *${curBulanStr}* telah terbit.\n\n💰 *Total: ${formatRp(activeCust.harga)}*\n📅 Jatuh tempo: tgl *${activeCust.due_date || '-'}*\nNo. Invoice: *${invNo}*\n\nSilakan lakukan pembayaran sebelum tanggal jatuh tempo untuk menghindari pemutusan layanan.\n\nTerima kasih 🙏`;
    document.getElementById('preview-invoice').innerText = invMsg;

    let notaMsg = `LUNAS ✅\n\nHalo *${safeName}*,\n\nPembayaran tagihan internet *${activeCust.packname || '-'}* periode *${curBulanStr}* telah kami terima.\n\n💰 *Nominal: ${formatRp(activeCust.harga)}*\n📅 Tgl Lunas: *${new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}*\n\nTerima kasih atas pembayaran Anda! 🙏`;
    document.getElementById('preview-nota').innerText = notaMsg;

    // Reset ke tab Info
    document.querySelectorAll('.s-tab')[0].click();
    document.getElementById('detail-sheet').classList.add('active');
}

function closeDetailScreen() { document.getElementById('detail-sheet').classList.remove('active'); activeCust = null;}

// WA SENDERS
function kirimInvoiceWA() {
    let msg = document.getElementById('preview-invoice').innerText;
    window.open(`https://wa.me/${activeCust.phone || ''}?text=${encodeURIComponent(msg)}`, '_blank');
}
function kirimNotaWA() {
    let msg = document.getElementById('preview-nota').innerText;
    window.open(`https://wa.me/${activeCust.phone || ''}?text=${encodeURIComponent(msg)}`, '_blank');
}

// FORM TAMBAH / EDIT
function bukaModalTambah() {
    document.getElementById('customer-form').reset();
    document.getElementById('form-id').value = "";
    document.getElementById('form-title').innerText = "Customer Baru";
    openModal('modal-form');
}

function openEditModal() {
    if(!activeCust) return;
    document.getElementById('form-title').innerText = "Edit Data Pelanggan";
    document.getElementById('form-id').value = activeCust.id;
    document.getElementById('cust-name').value = activeCust.name;
    document.getElementById('cust-phone').value = activeCust.phone;
    document.getElementById('cust-address').value = activeCust.address || "";
    document.getElementById('cust-package').value = activeCust.packname;
    document.getElementById('cust-price').value = activeCust.harga;
    document.getElementById('cust-user').value = activeCust.pppoe_username;
    document.getElementById('cust-pass').value = activeCust.pppoe_password;
    document.getElementById('cust-due').value = activeCust.due_date;
    
    closeDetailScreen(); 
    openModal('modal-form');
}

document.getElementById('customer-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    let id = document.getElementById('form-id').value;
    let payload = {
        name: document.getElementById('cust-name').value,
        phone: document.getElementById('cust-phone').value,
        address: document.getElementById('cust-address').value,
        packname: document.getElementById('cust-package').value,
        harga: parseInt(document.getElementById('cust-price').value),
        pppoe_username: document.getElementById('cust-user').value,
        pppoe_password: document.getElementById('cust-pass').value,
        due_date: parseInt(document.getElementById('cust-due').value)
    };

    let btn = document.getElementById('btn-save-cust');
    btn.innerText = "Menyimpan...";
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
    } catch(err) { alert(err.message); }
    finally { btn.innerText = "SIMPAN DATA"; }
});

// MODAL BAYAR
function bukaModalBayar() {
    if(!activeCust) return;
    closeDetailScreen();
    document.getElementById('pay-id').value = activeCust.id;
    document.getElementById('pay-cust-name').innerText = activeCust.name + " — " + activeCust.packname;
    document.getElementById('pay-amount').value = activeCust.harga;
    openModal('modal-pay');
}

document.getElementById('payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    let id = document.getElementById('pay-id').value;
    let amt = parseInt(document.getElementById('pay-amount').value);
    let method = document.getElementById('pay-method').value;
    let cust = globalCustomers.find(c => String(c.id) === String(id));
    
    try {
        await db.from('payments').insert([{ customer_id: id, amount: amt, payment_method: method }]);
        
        if(cust && cust.isolation_status === 'ISOLATED') {
            await fetch(SUPABASE_URL + '/functions/v1/mikrotik', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY },
                body: JSON.stringify({ pppoe_username: cust.pppoe_username, action: 'NORMAL' })
            });
            await db.from('customers').update({ isolation_status: 'NORMAL' }).eq('id', id);
        }

        closeModal('modal-pay');
        alert("Pembayaran berhasil dicatat!");
        
        initData();
        activeCust = globalCustomers.find(c => String(c.id) === String(id));
        openDetail(id);
        setTimeout(() => { document.querySelectorAll('.s-tab')[1].click(); }, 300);

    } catch(err) { alert(err.message); }
});

// MIKROTIK EKSEKUSI
async function eksekusiMikrotik(customerId, pppoeUser, makeIsolated) {
    let actionText = makeIsolated ? 'ISOLATED' : 'NORMAL';
    document.getElementById('btn-det-action').innerText = "Processing...";
    try {
        await fetch(SUPABASE_URL + '/functions/v1/mikrotik', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY },
            body: JSON.stringify({ pppoe_username: pppoeUser, action: actionText })
        });
        await db.from('customers').update({ isolation_status: actionText }).eq('id', customerId);
        
        closeDetailScreen();
        initData();
    } catch(e) { alert(e.message); document.getElementById('btn-det-action').innerText = "FAILED"; }
}

// SEARCH FILTER
document.getElementById('search-customer').addEventListener('input', function(e) {
    let term = e.target.value.toLowerCase();
    let filtered = globalCustomers.filter(c => String(c.name || '').toLowerCase().includes(term) || String(c.phone || '').includes(term));
    renderCustomerList(filtered);
});
