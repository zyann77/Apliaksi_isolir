// INIT SUPABASE
const SUPABASE_URL = 'https://vljvulbjxhuysesronog.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsanZ1bGJqeGh1eXNlc3Jvbm9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMjgyOTcsImV4cCI6MjEwMjYwNDI5N30.yPq1kySc9iPuOdS_eCWGRc60gUoklNqc2YRLQ7ILCIk';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let globalCustomers = [];
let globalPayments = [];
let activeCust = null;

// AUTO LOGIN & AUTH
document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("isLoggedIn") === "true") {
        document.getElementById('login-screen').classList.remove('active');
        initData();
    }
});

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (document.getElementById('username').value === "admin" && document.getElementById('password').value === "1234") {
        localStorage.setItem("isLoggedIn", "true"); 
        document.getElementById('login-screen').classList.remove('active');
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
    await Promise.all([loadCustomers(), loadPayments()]);
    calcDashboard();
}

// FORMAT RUPIAH
const formatRp = (angka) => "Rp" + (angka || 0).toLocaleString('id-ID');

// LOAD DATABASE
async function loadCustomers() {
    let list = document.getElementById('customer-list');
    let { data } = await db.from('customers').select('*').order('created_at', { ascending: false });
    globalCustomers = data || [];
    renderCustomerList(globalCustomers);
}

async function loadPayments() {
    let { data } = await db.from('payments').select('*');
    globalPayments = data || [];
}

// RENDER CARDS
function renderCustomerList(data) {
    let list = document.getElementById('customer-list');
    list.innerHTML = '';
    data.forEach(cust => {
        let isIso = cust.isolation_status === 'ISOLATED';
        let avatar = cust.name.charAt(0).toUpperCase() + cust.name.charAt(1).toUpperCase();
        
        list.innerHTML += `
            <div class="cust-card" onclick="openDetail('${cust.id}')">
                <div class="cc-top">
                    <div style="display:flex;">
                        <div class="cc-avatar">${avatar}</div>
                        <div>
                            <div class="cc-name">${cust.name}</div>
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
                    <span style="color:var(--navy);">Tgl ${cust.due_date}</span>
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
        // Cek Outstanding (Jika tidak ada record payment bulan ini)
        let hasPaid = globalPayments.some(p => p.customer_id === c.id && new Date(p.created_at).getMonth() === currMonth);
        if(!hasPaid) { outstanding += (c.harga || 0); unpaidCount++; }
    });
    
    let income = 0, incomeToday = 0;
    let today = new Date().getDate();
    globalPayments.forEach(p => { 
        let pd = new Date(p.created_at);
        if(pd.getMonth() === currMonth) income += parseFloat(p.amount); 
        if(pd.getDate() === today && pd.getMonth() === currMonth) incomeToday += parseFloat(p.amount);
    });

    // Dashboard
    document.getElementById('dash-income').innerText = formatRp(income);
    document.getElementById('dash-income-today').innerText = formatRp(incomeToday);
    document.getElementById('dash-outstanding').innerText = formatRp(outstanding);
    document.getElementById('s-total').innerText = globalCustomers.length;
    document.getElementById('s-online').innerText = tAct;
    document.getElementById('s-iso').innerText = tIso;

    // Billing Center
    document.getElementById('bill-outstanding').innerText = formatRp(outstanding);
    document.getElementById('bill-unpaid-count').innerText = unpaidCount;
    renderInvoiceList(currMonth);
}

// RENDER INVOICES
function renderInvoiceList(currMonth) {
    let list = document.getElementById('invoice-list');
    list.innerHTML = '';
    globalCustomers.forEach(cust => {
        let hasPaid = globalPayments.some(p => p.customer_id === cust.id && new Date(p.created_at).getMonth() === currMonth);
        let statusColor = hasPaid ? "var(--success)" : "var(--danger)";
        let statusText = hasPaid ? "LUNAS" : "BELUM BAYAR";
        
        list.innerHTML += `
            <div class="cust-card" onclick="openDetail('${cust.id}')">
                <div class="cc-top" style="margin-bottom:5px;">
                    <div class="cc-name">${cust.name}</div>
                    <div style="font-size:11px; font-weight:800; color:${statusColor};">● ${statusText}</div>
                </div>
                <div style="font-size:12px; color:var(--text-muted); font-weight:600;">${cust.packname} — ${formatRp(cust.harga)}</div>
            </div>`;
    });
}

// OPEN BOTTOM SHEET DETAIL
function openDetail(id) {
    activeCust = globalCustomers.find(c => c.id === id);
    if(!activeCust) return;
    
    let isIso = activeCust.isolation_status === 'ISOLATED';
    
    document.getElementById('det-name').innerText = activeCust.name;
    document.getElementById('det-avatar').innerText = activeCust.name.charAt(0).toUpperCase();
    document.getElementById('det-wa').innerText = activeCust.phone || '-';
    document.getElementById('det-pack').innerText = activeCust.packname || '-';
    document.getElementById('det-pppoe').innerText = activeCust.pppoe_username;
    document.getElementById('det-price').innerText = formatRp(activeCust.harga);
    document.getElementById('det-due').innerText = activeCust.due_date;

    document.getElementById('det-status-badge').innerText = isIso ? "ISOLATED" : "ONLINE";
    document.getElementById('det-status-badge').className = isIso ? "id-badge isolated" : "id-badge";

    // Format Pesan WA Tagihan
    let waMsg = `Halo ${activeCust.name}, kami dari ISP CENTER. Tagihan internet Anda sebesar ${formatRp(activeCust.harga)}. Jatuh tempo tgl ${activeCust.due_date}. Terima kasih.`;
    document.getElementById('det-wa-link').href = `https://wa.me/${activeCust.phone}?text=${encodeURIComponent(waMsg)}`;

    let btnAct = document.getElementById('btn-det-action');
    if(isIso) {
        btnAct.innerText = "ACTIVATE";
        btnAct.style.background = "var(--navy)";
        btnAct.onclick = () => eksekusiMikrotik(activeCust.id, activeCust.pppoe_username, false);
    } else {
        btnAct.innerText = "ISOLIR";
        btnAct.style.background = "var(--danger)";
        btnAct.onclick = () => eksekusiMikrotik(activeCust.id, activeCust.pppoe_username, true);
    }

    document.getElementById('detail-sheet').classList.add('active');
}

function closeDetailScreen() { document.getElementById('detail-sheet').classList.remove('active'); activeCust = null;}

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
    
    try {
        await db.from('payments').insert([{ customer_id: id, amount: amt, payment_method: method }]);
        let cust = globalCustomers.find(c => c.id === id);
        if(cust && cust.isolation_status === 'ISOLATED') {
            await fetch(SUPABASE_URL + '/functions/v1/mikrotik', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY },
                body: JSON.stringify({ pppoe_username: cust.pppoe_username, action: 'NORMAL' })
            });
            await db.from('customers').update({ isolation_status: 'NORMAL' }).eq('id', id);
        }
        closeModal('modal-pay');
        showSuccessAnim();
        initData();
    } catch(err) { alert(err.message); }
});

function showSuccessAnim() {
    let anim = document.getElementById('success-anim');
    anim.classList.add('active');
    setTimeout(() => { anim.classList.remove('active'); }, 1500);
}

// ADD/EDIT CUSTOMER
document.getElementById('customer-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    let payload = {
        name: document.getElementById('cust-name').value,
        phone: document.getElementById('cust-phone').value,
        packname: document.getElementById('cust-package').value,
        harga: parseInt(document.getElementById('cust-price').value),
        pppoe_username: document.getElementById('cust-user').value,
        pppoe_password: document.getElementById('cust-pass').value,
        due_date: parseInt(document.getElementById('cust-due').value),
        isolation_status: 'NORMAL'
    };

    try {
        await db.from('customers').insert([payload]);
        document.getElementById('customer-form').reset();
        closeModal('modal-form');
        initData();
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
    let filtered = globalCustomers.filter(c => c.name.toLowerCase().includes(term) || (c.phone && c.phone.includes(term)));
    renderCustomerList(filtered);
});
