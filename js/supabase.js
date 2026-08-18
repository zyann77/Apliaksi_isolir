// Konfigurasi Supabase dengan URL dan Anon Key Anda
const SUPABASE_URL = 'https://ufvwxdjpmetpvogtvnxj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdnd4ZGpwbWV0cHZvZ3R2bnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNzY2MjMsImV4cCI6MjEwMTY1MjYyM30.xLjQZ23oUEPvatUsKXYq-xzavbc5VoMJGZglgcpEGKU';

// Inisialisasi Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Fungsi test koneksi (Opsional, untuk memastikan Supabase terhubung)
async function checkConnection() {
    console.log("Menghubungkan ke Supabase...");
    const { data, error } = await supabase.from('customers').select('*').limit(1);
    if (error) {
        console.error("Error koneksi Supabase:", error.message);
    } else {
        console.log("Supabase Berhasil Terhubung! Data:", data);
    }
}

// Jalankan test koneksi
checkConnection();
