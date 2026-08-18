// ==========================================
// 1. INISIALISASI SUPABASE (KONEKSI DATABASE)
// ==========================================
const SUPABASE_URL = 'https://ufvwxdjpmetpvogtvnxj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdnd4ZGpwbWV0cHZvZ3R2bnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNzY2MjMsImV4cCI6MjEwMTY1MjYyM30.xLjQZ23oUEPvatUsKXYq-xzavbc5VoMJGZglgcpEGKU';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Pengecekan koneksi saat aplikasi dimulai
async function checkSystemConnection() {
    console.log("> INITIATING DATABASE PING...");
    try {
        const { error } = await supabase.from('customers').select('id').limit(1);
        if (error) {
            console.error("> [WARNING] DATABASE CONNECTION FAILED:", error.message);
        } else {
            console.log("> [OK] DATABASE SECURELY CONNECTED.");
        }
    } catch (err) {
        console.error("> [FATAL ERROR] SYSTEM UNREACHABLE.");
    }
}
checkSystemConnection();

// ==========================================
// 2. CORE LOGIC APLIKASI (UI & NAVIGASI)
// ==========================================
const app = {
    init() {
        this.runSplashSequence();
    },

    runSplashSequence() {
        const terminal = document.getElementById('splash-terminal');
        const lines = [
            "> INITIALIZING SYSTEM...",
            "> CONNECTING DATABASE...",
            "> LOADING MIKROTIK CONTROL...",
            "> SECURITY CHECK...",
            "> SYSTEM READY"
        ];
        
        let i = 0;
        if (!terminal) return; // Mencegah error jika elemen tidak ada
        
        const interval = setInterval(() => {
            if (i < lines.length) {
                terminal.innerHTML += `<div>${lines[i]}</div>`;
                i++;
            } else {
                clearInterval(interval);
                setTimeout(() => {
                    terminal.classList.add('hidden');
                    const splashBrand = document.getElementById('splash-brand');
                    if(splashBrand) splashBrand.classList.remove('hidden');
                    
                    // Transisi ke Login
                    setTimeout(() => {
                        document.getElementById('splash').classList.remove('active');
                        document.getElementById('splash').classList.add('hidden');
                        document.getElementById('login-view').classList.remove('hidden');
                    }, 1500);
                }, 500);
            }
        }, 300);
    },

    login() {
        document.getElementById('login-status').innerText = "SYSTEM: AUTHENTICATING...";
        document.getElementById('login-status').classList.add('text-neon');
        
        setTimeout(() => {
            document.getElementById('login-view').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            this.startTerminalLog();
            this.animateCounters();
        }, 1000);
    },

    navigate(viewId) {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active', 'hidden'));
        document.querySelectorAll('.page').forEach(page => {
            if (page.id !== viewId) page.classList.add('hidden');
        });
        
        document.getElementById(viewId).classList.remove('hidden');
        document.getElementById(viewId).classList.add('active');

        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        if(event && event.currentTarget) event.currentTarget.classList.add('active');
    },

    startTerminalLog() {
        const logBox = document.getElementById('system-log');
        if(!logBox) return;
        
        const logs = [
            "DATABASE CONNECTED",
            "MIKROTIK READY",
            "ISOLATION ENGINE ACTIVE"
        ];
        
        let index = 0;
        setInterval(() => {
            if (index < logs.length) {
                const time = new Date().toLocaleTimeString('id-ID');
                const logEntry = document.createElement('div');
                logEntry.innerText = `[${time}] > ${logs[index]}`;
                logBox.appendChild(logEntry);
                logBox.scrollTop = logBox.scrollHeight;
                index++;
            }
        }, 1000);
    },

    animateCounters() {
        this.countUp('stat-total', 0);
    },

    countUp(elementId, target) {
        let current = 0;
        const el = document.getElementById(elementId);
        if(!el) return;
        
        const inc = target === 0 ? 0 : Math.ceil(target / 20);
        const timer = setInterval(() => {
            current += inc;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            el.innerText = current;
        }, 50);
    }
};

window.onload = () => app.init();
