// INIT SUPABASE
const SUPABASE_URL = 'https://ufvwxdjpmetpvogtvnxj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdnd4ZGpwbWV0cHZvZ3R2bnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNzY2MjMsImV4cCI6MjEwMTY1MjYyM30.xLjQZ23oUEPvatUsKXYq-xzavbc5VoMJGZglgcpEGKU';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let globalCustomers = [];
let globalPayments = [];
let globalPackages = [];
let activeCust = null;
let currentBillingFilter = 'semua';
let currentCustomerFilter = 'semua'; 

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
        await loadPackages(); 
        await Promise.all([loadCustomers(), loadPayments()]);
        calcDashboard();
        
        let term = document.getElementById('search-customer').value.toLowerCase();
        let data = globalCustomers.filter(c => String(c.name || '').toLowerCase().includes(term) || String(c.phone || '').includes(term));
        renderCustomerList(data);
    } catch(e) { console.error("Error Initialize:", e); }
}

const formatRp = (angka) => "Rp " + (Number(angka) || 0).toLocaleString('id-ID');

function getCustPrice(cust) {
    if(cust.harga && Number(cust.harga) > 0) return Number(cust.harga);
    if(cust.packages && cust.packages.price) return Number(cust.packages.price);
    return 0;
}

// MENGAMBIL DAFTAR PAKET
async function loadPackages() {
    let { data, error } = await db.from('packages').select('*').eq('status', 'ACTIVE');
    if(error) console.error("Error Packages:", error);
    globalPackages = data || [];
    
    let selectEl = document.getElementById('cust-package-id');
    if(selectEl) {
        selectEl.innerHTML = '<option value="">-- Pilih Paket Internet --</option>';
        globalPackages.forEach(p => {
            selectEl.innerHTML += `<option value="${p.id}">${p.ppp_profile}</option>`;
        });
    }
}

// MENGAMBIL PELANGGAN
async function loadCustomers() {
    let { data, error } = await db.from('customers').select('*, packages(ppp_profile, price)').order('created_at', { ascending: false });
    if(error) console.error("Error Customers:", error);
    globalCustomers = data || [];
}

// MENGAMBIL PEMBAYARAN
async function loadPayments() {
    let { data, error } = await db.from('payments').select('*');
    if(error) console.error("Error Payments:", error);
    globalPayments = data || [];
}

function filterCustomer(type, el) {
    currentCustomerFilter = type;
    document.querySelectorAll('#view-customers .chip').forEach(c => c.classList.remove('active'));
    if(el) el.classList.add('active');
    
    let term = document.getElementById('search-customer').value.toLowerCase();
    let data = globalCustomers.filter(c => String(c.name || '').toLowerCase().includes(term) || String(c.phone || '').includes(term));
    renderCustomerList(data);
}

// RENDER CUSTOMERS 
function renderCustomerList(dataToRender) {
    let list = document.getElementById('customer-list');
    list.innerHTML = '';
    
    let d = new Date();
    let tahunBulanStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;

    let filteredData = dataToRender.filter(cust => {
        let isIso = cust.isolation_status === 'ISOLATED';
        let hasPaid = globalPayments.some(p => p.customer_id === cust.id && String(p.billing_period).includes(tahunBulanStr));
        
        if(currentCustomerFilter === 'aktif' && isIso) return false;
        if(currentCustomerFilter === 'isolir' && !isIso) return false;
        if(currentCustomerFilter === 'lunas' && !hasPaid) return false;
        if(currentCustomerFilter === 'belum-bayar' && hasPaid) return false;
        return true;
    });

    filteredData.forEach(cust => {
        let isIso = cust.isolation_status === 'ISOLATED';
        let hasPaid = globalPayments.some(p => p.customer_id === cust.id && String(p.billing_period).includes(tahunBulanStr));
        
        let safeName = String(cust.name || 'User');
        let avatar = safeName.charAt(0).toUpperCase();
        if(safeName.length > 1) avatar += safeName.charAt(1).toUpperCase();
        
        let packName = cust.packages ? cust.packages.ppp_profile : '-';
        let packPrice = getCustPrice(cust);

        let payBadge = hasPaid 
            ? `<span style="font-size:10px; font-weight:800; color:var(--success); background:var(--cyan-light); padding:3px 8px; border-radius:6px; margin-top:5px; display:inline-block;">✓ LUNAS</span>`
            : `<span style="font-size:10px; font-weight:800; color:var(--danger); background:var(--danger-light); padding:3px 8px; border-radius:6px; margin-top:5px; display:inline-block;">! BELUM BAYAR</span>`;
        
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
                    <div style="text-align:right;">
                        <div class="id-badge ${isIso ? 'isolated' : ''}">● ${isIso ? 'ISOLATED' : 'AKTIF'}</div>
                        ${payBadge}
                    </div>
                </div>
                <div class="cc-mid">
                    <span class="cc-pack">${packName}</span>
                    <span class="cc-price">${formatRp(packPrice)} / bln</span>
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
    
    let d = new Date();
    let tahunBulanStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    let hariIniStr = `${tahunBulanStr}-${String(d.getDate()).padStart(2,'0')}`;
    
    globalCustomers.forEach(c => {
        c.isolation_status === 'ISOLATED' ? tIso++ : tAct++;
        let hasPaid = globalPayments.some(p => p.customer_id === c.id && String(p.billing_period).includes(tahunBulanStr));
        if(!hasPaid) { 
            outstanding += getCustPrice(c); 
            unpaidCount++; 
        }
    });
    
    let income = 0, incomeToday = 0;
    
    globalPayments.forEach(p => { 
        let amt = parseFloat(p.amount) || 0;
        let tglBayar = p.payment_date || p.created_at || "";
        
        if (tglBayar.includes(tahunBulanStr)) income += amt;
        if (tglBayar.includes(hariIniStr)) incomeToday += amt;
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
    
    let d = new Date();
    let tahunBulanStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    let todayDate = d.getDate();
    let countToday = 0;

    globalCustomers.forEach(cust => {
        let hasPaid = globalPayments.some(p => p.customer_id === cust.id && String(p.billing_period).includes(tahunBulanStr));
        if(hasPaid) return; 
        
        let dueDateNum = Number(cust.due_date);
        if(dueDateNum === todayDate) countToday++;
        if(currentBillingFilter === 'hari-ini' && dueDateNum !== todayDate) return;

        let curBulanStr = d.toLocaleString('id-ID', {month:'long', year:'numeric'});
        let invNo = "INV-" + d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + "-" + String(cust.customer_code).replace('CUST-','');
        let packName = cust.packages?.ppp_profile || '-';
        let packPrice = getCustPrice(cust);

        let waMsg = `Halo *${cust.name || 'Pelanggan'}*,\n\nTagihan internet *${packName}* Anda untuk periode *${curBulanStr}* telah terbit.\n\n💰 *Total: ${formatRp(packPrice)}*\n📅 Jatuh tempo: tgl *${cust.due_date || '-'}*\nNo. Invoice: *${invNo}*\n\nSilakan lakukan pembayaran sebelum tanggal jatuh tempo untuk menghindari pemutusan layanan.\n\nTerima kasih 🙏`;

        list.innerHTML += `
            <div class="cust-card">
                <div class="cc-top" style="margin-bottom:5px;">
                    <div class="cc-name" onclick="openDetail('${cust.id}')">${cust.name || 'User'}</div>
                    <div style="font-size:11px; font-weight:800; color:var(--danger);">● BELUM BAYAR</div>
                </div>
                <div style="font-size:12px; color:var(--text-muted); font-weight:600; margin-bottom:12px;">${packName} — ${formatRp(packPrice)}</div>
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

// 🚀 FUNGSI TARIK DATA DARI API MIKROTIK
async function fetchMikrotikStatus(pppoe_username) {
    try {
        let response = await fetch(SUPABASE_URL + '/functions/v1/mikrotik', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY },
            body: JSON.stringify({ pppoe_username: pppoe_username, action: 'STATUS' })
        });
        
        let result = await response.json();
        
        if (result && !result.error) {
            document.getElementById('det-uptime').innerText = result.uptime || 'Offline';
            document.getElementById('det-remote').innerText = result.remote_address || '-';
            document.getElementById('det-logout').innerText = result.last_logout || '-';
            document.getElementById('det-uptime').style.color = result.uptime ? 'var(--success)' : 'var(--danger)';
        } else {
            document.getElementById('det-uptime').innerText = 'Offline / Data Tidak Ditemukan';
            document.getElementById('det-uptime').style.color = 'var(--danger)';
            document.getElementById('det-remote').innerText = '-';
            document.getElementById('det-logout').innerText = '-';
        }
    } catch(e) {
        document.getElementById('det-uptime').innerText = 'Gagal Konek ke Router API';
        document.getElementById('det-uptime').style.color = 'var(--danger)';
        document.getElementById('det-remote').innerText = '-';
        document.getElementById('det-logout').innerText = '-';
    }
}

// OPEN BOTTOM SHEET DETAIL
function openDetail(id) {
    activeCust = globalCustomers.find(c => String(c.id) === String(id));
    if(!activeCust) return;
    
    let isIso = activeCust.isolation_status === 'ISOLATED';
    let safeName = String(activeCust.name || 'User');
    let packName = activeCust.packages?.ppp_profile || '-';
    let packPrice = getCustPrice(activeCust);
    
    // Cek Pembayaran Bulan Ini
    let d = new Date();
    let tahunBulanStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    let hasPaid = globalPayments.some(p => p.customer_id === activeCust.id && String(p.billing_period).includes(tahunBulanStr));

    document.getElementById('det-name').innerText = safeName;
    document.getElementById('det-avatar').innerText = safeName.charAt(0).toUpperCase();
    document.getElementById('det-status-badge').innerText = isIso ? "ISOLATED" : "ONLINE";
    document.getElementById('det-status-badge').className = isIso ? "id-badge isolated" : "id-badge";

    document.getElementById('det-code').innerText = activeCust.customer_code || '-';
    document.getElementById('det-pppoe').innerText = activeCust.pppoe_username || '-';
    document.getElementById('det-reg').innerText = activeCust.installation_date || new Date().toISOString().split('T')[0];
    document.getElementById('det-due').innerText = activeCust.due_date || '0';
    document.getElementById('det-address').innerText = activeCust.address || "Belum ada data alamat.";
    document.getElementById('det-pack').innerText = packName;
    document.getElementById('det-price').innerText = formatRp(packPrice);

    // 🚀 TAMPILKAN LOADING SEBELUM DATA MIKROTIK MASUK
    document.getElementById('det-uptime').innerText = 'Memuat dari Router...';
    document.getElementById('det-uptime').style.color = 'var(--text-muted)';
    document.getElementById('det-remote').innerText = 'Memuat...';
    document.getElementById('det-logout').innerText = 'Memuat...';
    
    // 🚀 JALANKAN PEMANGGILAN API MIKROTIK
    if(activeCust.pppoe_username) {
        fetchMikrotikStatus(activeCust.pppoe_username);
    }

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

    // LOGIKA SEMBUNYIKAN TOMBOL BAYAR
    if (hasPaid) {
        document.getElementById('btn-pay-lunas').style.display = 'none'; 
        document.getElementById('preview-invoice').innerText = "✅ Tagihan bulan ini sudah dilunasi. Tidak perlu ditagih.";
    } else {
        document.getElementById('btn-pay-lunas').style.display = 'block'; 
        
        let curBulanStr = new Date().toLocaleString('id-ID', {month:'long', year:'numeric'});
        let invNo = "INV-" + new Date().getFullYear() + String(new Date().getMonth()+1).padStart(2,'0') + "-" + String(activeCust.customer_code).replace('CUST-','');
        let invMsg = `Halo *${safeName}*,\n\nTagihan internet *${packName}* Anda untuk periode *${curBulanStr}* telah terbit.\n\n💰 *Total: ${formatRp(packPrice)}*\n📅 Jatuh tempo: tgl *${activeCust.due_date || '-'}*\nNo. Invoice: *${invNo}*\n\nSilakan lakukan pembayaran sebelum tanggal jatuh tempo untuk menghindari pemutusan layanan.\n\nTerima kasih 🙏`;
        document.getElementById('preview-invoice').innerText = invMsg;
    }

    let curBulanStr = new Date().toLocaleString('id-ID', {month:'long', year:'numeric'});
    let notaMsg = `LUNAS ✅\n\nHalo *${safeName}*,\n\nPembayaran tagihan internet *${packName}* periode *${curBulanStr}* telah kami terima.\n\n💰 *Nominal: ${formatRp(packPrice)}*\n📅 Tgl Lunas: *${new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}*\n\nTerima kasih atas pembayaran Anda! 🙏`;
    document.getElementById('preview-nota').innerText = notaMsg;

    document.querySelectorAll('.s-tab')[0].click();
    
    document.getElementById('swipeable-sheet').style.transform = '';
    document.getElementById('detail-sheet').classList.add('active');
}

function closeDetailScreen() { 
    document.getElementById('detail-sheet').classList.remove('active'); 
    document.getElementById('swipeable-sheet').style.transform = '';
    activeCust = null; 
}

// SWIPE DOWN TO CLOSE
let sheetContent = document.getElementById('swipeable-sheet');
let startY = 0;
let currentY = 0;
let isDragging = false;

sheetContent.addEventListener('touchstart', (e) => {
    let contentDiv = e.target.closest('.sheet-content');
    if(contentDiv && contentDiv.scrollTop > 0) return; 
    
    startY = e.touches[0].clientY;
    isDragging = true;
    sheetContent.style.transition = 'none'; 
}, {passive: true});

sheetContent.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentY = e.touches[0].clientY;
    let deltaY = currentY - startY;
    
    if (deltaY > 0) {
        sheetContent.style.transform = `translateY(${deltaY}px)`;
    }
}, {passive: true});

sheetContent.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    sheetContent.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1)';
    
    let deltaY = currentY - startY;
    if (deltaY > 150) { 
        closeDetailScreen();
    } else { 
        sheetContent.style.transform = ''; 
    }
});


async function hapusPelanggan() {
    if(!activeCust) return;
    let confirmDelete = confirm(`⚠️ PERINGATAN!\n\nApakah bos yakin ingin MENGHAPUS pelanggan bernama ${activeCust.name} secara permanen?\n\nSemua riwayat tagihannya juga akan terhapus.`);
    if(!confirmDelete) return;

    let idToDelete = activeCust.id;
    closeDetailScreen(); 

    try {
        await db.from('payments').delete().eq('customer_id', idToDelete);
        const { error } = await db.from('customers').delete().eq('id', idToDelete);
        if (error) throw error;

        alert("✅ Pelanggan berhasil dihapus permanen!");
        initData(); 
    } catch(err) {
        alert("❌ Gagal menghapus pelanggan!\nDetail: " + err.message);
    }
}

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
    document.getElementById('cust-name').value = activeCust.name || "";
    document.getElementById('cust-phone').value = activeCust.phone || "";
    document.getElementById('cust-address').value = activeCust.address || "";
    document.getElementById('cust-package-id').value = activeCust.package_id || ""; 
    document.getElementById('cust-user').value = activeCust.pppoe_username || "";
    document.getElementById('cust-pass').value = activeCust.pppoe_password || "";
    document.getElementById('cust-due').value = activeCust.due_date || "";
    
    document.getElementById('cust-price').value = getCustPrice(activeCust);
    
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
        package_id: document.getElementById('cust-package-id').value, 
        harga: parseInt(document.getElementById('cust-price').value),
        pppoe_username: document.getElementById('cust-user').value,
        pppoe_password: document.getElementById('cust-pass').value,
        due_date: parseInt(document.getElementById('cust-due').value)
    };

    let btn = document.getElementById('btn-save-cust');
    btn.innerText = "MENYIMPAN...";
    btn.disabled = true;

    try {
        if(id) {
            const { error } = await db.from('customers').update(payload).eq('id', id);
            if (error) throw error; 
            alert("Perubahan Data Berhasil Disimpan!");
        } else {
            payload.isolation_status = 'NORMAL';
            payload.payment_status = 'UNPAID';
            const { error } = await db.from('customers').insert([payload]);
            if (error) throw error;
            alert("Pelanggan Baru Berhasil Ditambahkan!");
        }
        
        document.getElementById('customer-form').reset();
        closeModal('modal-form');
        await initData();
        if(id) openDetail(id);
        
    } catch(err) { 
        alert("GAGAL MENYIMPAN!\nPenyebab: " + err.message); 
    } finally { 
        btn.innerText = "SIMPAN DATA"; 
        btn.disabled = false;
    }
});

// MODAL BAYAR
function bukaModalBayar() {
    if(!activeCust) return;
    
    let idToPay = activeCust.id;
    let nameToPay = activeCust.name + " — " + (activeCust.packages?.ppp_profile || '');
    let amountToPay = getCustPrice(activeCust);

    closeDetailScreen();

    document.getElementById('pay-id').value = idToPay;
    document.getElementById('pay-cust-name').innerText = nameToPay;
    document.getElementById('pay-amount').value = amountToPay;
    
    openModal('modal-pay');
}

async function prosesPembayaran() {
    let btn = document.getElementById('btn-confirm-pay');
    btn.innerText = "MEMPROSES...";
    btn.disabled = true;

    try {
        let id = document.getElementById('pay-id').value;
        let amt = parseInt(document.getElementById('pay-amount').value);
        let method = document.getElementById('pay-method').value;
        let cust = globalCustomers.find(c => String(c.id) === String(id));
        
        let d = new Date();
        let billingPeriod = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;

        const { error } = await db.from('payments').insert([{ 
            customer_id: id, 
            amount: amt, 
            payment_method: method,
            billing_period: billingPeriod
        }]);
        
        if (error) throw error; 
        
        if(cust && cust.isolation_status === 'ISOLATED') {
            try {
                await fetch(SUPABASE_URL + '/functions/v1/mikrotik', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY },
                    body: JSON.stringify({ pppoe_username: cust.pppoe_username, action: 'NORMAL' })
                });
                await db.from('customers').update({ isolation_status: 'NORMAL' }).eq('id', id);
            } catch(e) {
                console.warn("Mikrotik update skipped: ", e);
            }
        }

        closeModal('modal-pay');
        alert("💰 SUKSES! Pembayaran berhasil tercatat di sistem.");
        
        await initData();
        activeCust = globalCustomers.find(c => String(c.id) === String(id));
        if(activeCust) {
            openDetail(id);
            setTimeout(() => { document.querySelectorAll('.s-tab')[1].click(); }, 300);
        }

    } catch(err) { 
        alert("❌ GAGAL MEMBAYAR!\nDetail Error: " + err.message); 
    } finally {
        btn.innerText = "CONFIRM PAYMENT";
        btn.disabled = false;
    }
}

async function eksekusiMikrotik(customerId, pppoeUser, makeIsolated) {
    let actionText = makeIsolated ? 'ISOLATED' : 'NORMAL';
    document.getElementById('btn-det-action').innerText = "Processing...";
    try {
        await fetch(SUPABASE_URL + '/functions/v1/mikrotik', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY },
            body: JSON.stringify({ pppoe_username: pppoeUser, action: actionText })
        });
        const { error } = await db.from('customers').update({ isolation_status: actionText }).eq('id', customerId);
        if (error) throw error;

        closeDetailScreen();
        await initData();
        openDetail(customerId);
    } catch(e) { 
        alert("Gagal Eksekusi: " + e.message); 
        document.getElementById('btn-det-action').innerText = "FAILED"; 
    }
}

document.getElementById('search-customer').addEventListener('input', function(e) {
    let term = e.target.value.toLowerCase();
    let filtered = globalCustomers.filter(c => String(c.name || '').toLowerCase().includes(term) || String(c.phone || '').includes(term));
    renderCustomerList(filtered);
});
