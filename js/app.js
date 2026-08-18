// 1. Inisialisasi Supabase (PENTING: Gunakan Anon Key, BUKAN Service Key di JS!)
const SUPABASE_URL = 'https://XYZ.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhb...'; 
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Navigasi SPA Ala iOS
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Hapus status active dari nav
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        // Sembunyikan semua views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
            view.classList.add('hidden');
        });
        
        // Tampilkan target view
        const targetId = item.getAttribute('data-target');
        const targetView = document.getElementById(targetId);
        targetView.classList.remove('hidden');
        
        // Paksa reflow untuk trigger animasi CSS
        void targetView.offsetWidth; 
        targetView.classList.add('active');
    });
});

// 3. Fetch Data Dashboard Realtime
async function loadDashboardStats() {
    try {
        // Ambil jumlah total pelanggan
        const { count: total, error } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true });
            
        if (!error) document.getElementById('stat-total').innerText = total;

        // Animasikan angka naik (Counter Animation)
        animateValue("stat-total", 0, total, 1000);
        
    } catch (error) {
        console.error("Gagal load data:", error);
    }
}

// 4. Fitur Auto-Isolir (Panggilan ke Edge Function, BUKAN database langsung)
async function triggerManualIsolir(customerId) {
    try {
        // Panggil proxy Edge Function agar credential aman
        const { data, error } = await supabase.functions.invoke('mikrotik-api', {
            body: { action: 'ISOLATE', customerId: customerId }
        });

        if (error) throw error;
        
        alert("Berhasil mengisolir pelanggan!");
        // Refresh UI
    } catch (error) {
        alert("Gagal menghubungi MikroTik: " + error.message);
    }
}

// 5. Integrasi WhatsApp (Format Pesan)
function kirimWA(nomorHP, nama, tagihan, tglJatuhTempo) {
    // Format ke internasional jika berawalan 0
    let no = nomorHP.startsWith('0') ? '62' + nomorHP.slice(1) : nomorHP;
    let pesan = `Halo *${nama}*, kami mengingatkan bahwa layanan internet Anda dengan tagihan Rp${tagihan} telah melewati batas waktu (${tglJatuhTempo}). Layanan Anda saat ini kami isolir sementara. Silakan hubungi kami untuk konfirmasi pembayaran.`;
    
    let url = `https://wa.me/${no}?text=${encodeURIComponent(pesan)}`;
    window.open(url, '_blank');
}

// Utils: Animasi Angka
function animateValue(id, start, end, duration) {
    if (start === end) return;
    let range = end - start;
    let current = start;
    let increment = end > start ? 1 : -1;
    let stepTime = Math.abs(Math.floor(duration / range));
    let obj = document.getElementById(id);
    let timer = setInterval(function() {
        current += increment;
        obj.innerHTML = current;
        if (current == end) {
            clearInterval(timer);
        }
    }, stepTime);
}

// Init
document.addEventListener("DOMContentLoaded", () => {
    loadDashboardStats();
    
    // Set Jam Digital
    setInterval(() => {
        const now = new Date();
        const options = { weekday: 'long', day: 'numeric', month: 'short' };
        document.getElementById('realtime-date').innerText = now.toLocaleDateString('id-ID', options);
    }, 1000);
});
