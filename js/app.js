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
        const interval = setInterval(() => {
            if (i < lines.length) {
                terminal.innerHTML += `<div>${lines[i]}</div>`;
                i++;
            } else {
                clearInterval(interval);
                setTimeout(() => {
                    terminal.classList.add('hidden');
                    document.getElementById('splash-brand').classList.remove('hidden');
                    
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
        // Simulasi Login (Akan dihubungkan dengan Supabase Auth)
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
        // Matikan semua view
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active', 'hidden'));
        document.querySelectorAll('.page').forEach(page => {
            if (page.id !== viewId) page.classList.add('hidden');
        });
        
        // Aktifkan view yang dipilih
        document.getElementById(viewId).classList.remove('hidden');
        document.getElementById(viewId).classList.add('active');

        // Update Bottom Nav UI
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');
    },

    startTerminalLog() {
        const logBox = document.getElementById('system-log');
        const logs = [
            "DATABASE CONNECTED",
            "MIKROTIK ONLINE",
            "CLIENT DATABASE SYNC",
            "AUTO ISOLATION READY",
            "SYSTEM MONITORING..."
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
        // Contoh animasi counting
        this.countUp('stat-total', 128);
        this.countUp('stat-active', 121);
        this.countUp('stat-warning', 4);
        this.countUp('stat-isolated', 3);
    },

    countUp(elementId, target) {
        let current = 0;
        const el = document.getElementById(elementId);
        const inc = Math.ceil(target / 20);
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
