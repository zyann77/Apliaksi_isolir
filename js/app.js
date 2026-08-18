// ==========================================
// 1. KONEKSI DATABASE SUPABASE
// ==========================================
const SUPABASE_URL = 'https://ufvwxdjpmetpvogtvnxj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdnd4ZGpwbWV0cHZvZ3R2bnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNzY2MjMsImV4cCI6MjEwMTY1MjYyM30.xLjQZ23oUEPvatUsKXYq-xzavbc5VoMJGZglgcpEGKU';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 2. ENGINE UI & NAVIGASI (APP)
// ==========================================
const app = {
    init() {
        this.runSplashSequence();
    },

    runSplashSequence() {
        const terminal = document.getElementById('splash-terminal');
        const lines = [
            "> INITIALIZING SYSTEM...",
            "> CONNECTING TO SUPABASE...",
            "> LOADING SECURITY PROTOCOLS...",
            "> SYSTEM READY."
        ];
        
        let i = 0;
        if (!terminal) return;
        
        const interval = setInterval(() => {
            if (i < lines.length) {
                terminal.innerHTML += `<div>${lines[i]}</div>`;
                i++;
            } else {
                clearInterval(interval);
                setTimeout(() => {
                    terminal.classList.add('hidden');
                    document.getElementById('splash-brand').classList.remove('hidden');
                    
                    setTimeout(() => {
                        document.getElementById('splash').classList.remove('active');
                        document.getElementById('splash').classList.add('hidden');
                        document.getElementById('login-view').classList.remove('hidden');
                    }, 1500);
                }, 800);
            }
        }, 400);
    },

    login() {
        document.getElementById('login-status').innerText = "SYSTEM: AUTHENTICATING...";
        document.getElementById('login-status').classList.add('text-neon');
        
        setTimeout(() => {
            document.getElementById('login-view').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
        }, 1000);
    },

    navigate(viewId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
            page.classList.add('hidden');
        });
        
        const targetView = document.getElementById(viewId);
        if(targetView) {
            targetView.classList.remove('hidden');
            targetView.classList.add('active');
        }

        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        if(event && event.currentTarget) {
            event.currentTarget.classList.add('active');
        }
    }
};

// ==========================================
// 3. LOGIKA PELANGGAN (CUSTOMERS)
// ==========================================
const customers = {
    togglePassword() {
        const passInput = document.getElementById('input-password');
        if (passInput.type === "password") passInput.type = "text";
        else passInput.type = "password";
    },

    async save(event) {
        event.preventDefault();

        const btnSave = document.getElementById('btn-save-client');
        const statusLog = document.getElementById('save-status-log');
        
        const nama = document.getElementById('input-nama').value;
        const secret = document.getElementById('input-secret').value;
        const password = document.getElementById('input-password').value;
        const tglRegistrasi = document.getElementById('input-reg-date').value;
        const tglIsolir = parseInt(document.getElementById('input-iso-date').value);

        btnSave.innerText = "[ PROCESSING... ]";
        btnSave.disabled = true;
        statusLog.classList.remove('hidden', 'text-danger');
        statusLog.classList.add('text-neon');
        statusLog.innerHTML = `> INITIATING DATABASE INJECTION...<br>`;

        try {
            const { data, error } = await supabase.from('customers').insert([
                {
                    name: nama,
                    pppoe_username: secret,
                    pppoe_password: password,
                    installation_date: tglRegistrasi,
                    due_date: tglIsolir,
                    payment_status: 'PAID',
                    connection_status: 'ACTIVE',
                    isolation_status: false
                }
            ]);

            if (error) throw error;

            statusLog.innerHTML += `> SECURE INJECTION SUCCESS.<br>> CLIENT [${secret}] REGISTERED.`;
            
            setTimeout(() => {
                document.getElementById('form-add-client').reset();
                btnSave.innerText = "[ EXECUTE: SAVE_CLIENT ]";
                btnSave.disabled = false;
                statusLog.classList.add('hidden');
                app.navigate('dashboard'); 
            }, 2000);

        } catch (error) {
            statusLog.classList.remove('text-neon');
            statusLog.classList.add('text-danger');
            statusLog.innerHTML += `> ERROR: ${error.message}`;
            
            btnSave.innerText = "[ RETRY ]";
            btnSave.disabled = false;
        }
    }
};

// ==========================================
// JALANKAN MESIN SAAT WEB DIBUKA
// ==========================================
window.onload = () => {
    app.init();
};
