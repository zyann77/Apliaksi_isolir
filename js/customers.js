const customers = {
    // Menampilkan/Menyembunyikan Password PPPoE
    togglePassword() {
        const passInput = document.getElementById('input-password');
        if (passInput.type === "password") {
            passInput.type = "text";
        } else {
            passInput.type = "password";
        }
    },

    // Menjalankan proses simpan data
    async save(event) {
        event.preventDefault(); // Mencegah form me-refresh halaman

        const btnSave = document.getElementById('btn-save-client');
        const statusLog = document.getElementById('save-status-log');
        
        // Ambil nilai dari form
        const nama = document.getElementById('input-nama').value;
        const secret = document.getElementById('input-secret').value;
        const password = document.getElementById('input-password').value;
        const tglRegistrasi = document.getElementById('input-reg-date').value;
        const tglIsolir = parseInt(document.getElementById('input-iso-date').value);

        // UI Feedback: Proses dimulai
        btnSave.innerText = "[ PROCESSING... ]";
        btnSave.disabled = true;
        statusLog.classList.remove('hidden');
        statusLog.innerHTML = `> INITIATING DATABASE INJECTION...<br>`;

        try {
            // Asumsi: Variabel 'supabase' sudah diinisialisasi di app.js
            // Menyimpan data ke tabel 'customers' di Supabase
            const { data, error } = await supabase
                .from('customers')
                .insert([
                    {
                        name: nama,
                        pppoe_username: secret,
                        pppoe_password: password,
                        installation_date: tglRegistrasi,
                        due_date: tglIsolir,
                        payment_status: 'PAID', // Default aktif saat registrasi awal
                        connection_status: 'ACTIVE',
                        isolation_status: false
                    }
                ]);

            if (error) throw error;

            // Jika sukses
            statusLog.classList.add('text-neon');
            statusLog.classList.remove('text-danger');
            statusLog.innerHTML += `> SECURE INJECTION SUCCESS.<br>> CLIENT [${secret}] REGISTERED.`;
            
            // Reset Form setelah 2 detik
            setTimeout(() => {
                document.getElementById('form-add-client').reset();
                btnSave.innerText = "[ EXECUTE: SAVE_CLIENT ]";
                btnSave.disabled = false;
                statusLog.classList.add('hidden');
                
                // Kembali ke halaman daftar klien
                app.navigate('clients'); 
            }, 2000);

        } catch (error) {
            // Jika gagal (Misal: Secret/Username PPPoE sudah dipakai)
            statusLog.classList.remove('text-neon');
            statusLog.classList.add('text-danger');
            statusLog.innerHTML += `> ERROR: ${error.message}`;
            
            btnSave.innerText = "[ RETRY ]";
            btnSave.disabled = false;
        }
    }
};
