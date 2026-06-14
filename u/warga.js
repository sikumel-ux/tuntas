/**
 * TUNTAS - Warga Panel Logic
 * Mengelola sinkronisasi data client-side dengan Firebase Realtime Database
 */

const DB_URL = "https://tuntas-04-default-rtdb.asia-southeast1.firebasedatabase.app";

// State Otentikasi Pengguna
let AKUN_WARGA_LOGGED_IN = null;
let KEY_WARGA_LOGGED_IN = null;

// Event Listener Utama saat DOM Selesai Dimuat
window.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    cekSessionWarga();
});

// Setup Semua Event Listener di Tombol & Form
function initEventListeners() {
    // Submit Form Login
    document.getElementById('formLoginWarga').addEventListener('submit', prosesLoginWarga);
    
    // Submit Form Kotak Saran
    document.getElementById('formSaranWarga').addEventListener('submit', kirimSaranAspirasi);
    
    // Tombol Global Header
    document.getElementById('btnRefresh').addEventListener('click', sinkronUlangWarga);
    document.getElementById('btnLogout').addEventListener('click', logoutWarga);
    
    // Listener Perubahan Tanggal Filter Kas
    document.getElementById('filterMulaiWarga').addEventListener('change', muatKasMasyarakat);
    document.getElementById('filterSelesaiWarga').addEventListener('change', muatKasMasyarakat);

    // Event Listener Tutup Modal Otomatis
    document.querySelectorAll('.btn-close-modal').forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-target');
            closeModal(modalId);
        });
    });

    // Event Listener Navigasi Tab Bottom Bar
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTabId = btn.getAttribute('data-target');
            switchWargaTab(targetTabId);
        });
    });
}

// Mengecek Status Login Sesi di LocalStorage
function cekSessionWarga() {
    const savedKey = localStorage.getItem('warga_key');
    const savedData = localStorage.getItem('warga_data');
    
    if (savedKey && savedData) {
        KEY_WARGA_LOGGED_IN = savedKey;
        AKUN_WARGA_LOGGED_IN = JSON.parse(savedData);
        
        // Sembunyikan layar login
        document.getElementById('scr-login').style.display = 'none';
        document.getElementById('labelNamaWarga').innerText = AKUN_WARGA_LOGGED_IN.nama;
        
        // Set Default Rentang Tanggal Filter Kas (Awal Bulan s/d Hari Ini)
        const hariIni = new Date();
        const y = hariIni.getFullYear();
        const m = String(hariIni.getMonth() + 1).padStart(2, '0');
        document.getElementById('filterMulaiWarga').value = `${y}-${m}-01`;
        document.getElementById('filterSelesaiWarga').value = hariIni.toISOString().split('T')[0];

        sinkronUlangWarga();
    } else {
        document.getElementById('scr-login').style.display = 'flex';
    }
}

// Alur Otentikasi Login Warga via Nomor WhatsApp
async function prosesLoginWarga(e) {
    e.preventDefault();
    document.getElementById('loadingOverlay').style.display = 'flex';
    
    const hp = document.getElementById('loginHp').value.trim();
    const pass = document.getElementById('loginPass').value.trim();

    try {
        const res = await fetch(`${DB_URL}/warga_rt04.json`);
        const data = await res.json();
        
        let ketemu = false;
        if (data) {
            Object.keys(data).forEach(key => {
                if (data[key].username === hp && data[key].password === pass) {
                    ketemu = true;
                    KEY_WARGA_LOGGED_IN = key;
                    AKUN_WARGA_LOGGED_IN = data[key];
                    
                    localStorage.setItem('warga_key', key);
                    localStorage.setItem('warga_data', JSON.stringify(data[key]));
                }
            });
        }

        if (ketemu) {
            document.getElementById('scr-login').style.display = 'none';
            document.getElementById('labelNamaWarga').innerText = AKUN_WARGA_LOGGED_IN.nama;
            showNotif('Login Berhasil!', 'sukses');
            cekSessionWarga(); // Muat ulang sesi agar data inisialisasi aman
        } else {
            showNotif('No WA atau Password Salah', 'gagal');
        }
    } catch (err) {
        showNotif('Gagal terhubung ke database', 'gagal');
    } finally {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}

// Ambil Seluruh Data Terbaru Berjalan Paralel
async function sinkronUlangWarga() {
    if (!KEY_WARGA_LOGGED_IN) return;
    document.getElementById('loadingOverlay').style.display = 'flex';
    await Promise.all([
        muatKasMasyarakat(), 
        muatIuranSaya(), 
        muatSampahSaya(), 
        muatBeritaWarga(), 
        jalankanPopupMaklumat()
    ]);
    document.getElementById('loadingOverlay').style.display = 'none';
}

// Perpindahan Tab Menu Bawah
function switchWargaTab(id) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(id).classList.add('active');

    if (id === 'scr-w-kas') document.getElementById('nav-btn-w-kas').classList.add('active');
    else if (id === 'scr-w-iuran') document.getElementById('nav-btn-w-iuran').classList.add('active');
    else if (id === 'scr-w-sampah') document.getElementById('nav-btn-w-sampah').classList.add('active');
    else if (id === 'scr-w-info') document.getElementById('nav-btn-w-info').classList.add('active');
}

// Muat dan Kalkulasi Buku Kas RT Dinamis Terfilter
async function muatKasMasyarakat() {
    const res = await fetch(`${DB_URL}/kas_rt04.json`);
    const data = await res.json();
    const list = document.getElementById('listWargaKas');
    list.innerHTML = "";

    let start = new Date(document.getElementById('filterMulaiWarga').value);
    let end = new Date(document.getElementById('filterSelesaiWarga').value);
    end.setHours(23,59,59,999);

    let saldoKeseluruhan = 0;
    let sldTerapit = 0, mskTerapit = 0, klrTerapit = 0;

    if (!data) {
        list.innerHTML = `<div class="p-4 text-center text-xs text-slate-400 font-bold uppercase">Belum ada catatan kas.</div>`;
        updateTampilanCardKasWarga(0, 0, 0, 0);
        return;
    }

    Object.keys(data).forEach(key => {
        const v = data[key];
        const nom = parseInt(v.nominal) || 0;
        const tglItem = new Date(v.tanggal);

        // Akumulasi total saldo abadi tanpa batas filter
        if(v.jenis === 'masuk') { saldoKeseluruhan += nom; } else { saldoKeseluruhan -= nom; }

        // Akumulasi data dinamis terperangkap rentang tanggal filter
        if(tglItem >= start && tglItem <= end) {
            if(v.jenis === 'masuk') { mskTerapit += nom; } else { klrTerapit += nom; }
            sldTerapit = mskTerapit - klrTerapit;

            list.insertAdjacentHTML('afterbegin', `
                <div class="p-4 flex justify-between items-center bg-white">
                    <div>
                        <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wide">${v.keterangan}</h4>
                        <p class="text-[9px] font-mono text-slate-400 mt-0.5">${v.tanggal}</p>
                    </div>
                    <span class="text-xs font-black ${v.jenis==='masuk'?'text-emerald-600':'text-rose-600'}">
                        ${v.jenis==='masuk'?'+':'-'} ${nom.toLocaleString('id-ID')}
                    </span>
                </div>
            `);
        }
    });

    updateTampilanCardKasWarga(saldoKeseluruhan, sldTerapit, mskTerapit, klrTerapit);
}

// Render data kas ke dalam 4 elemen dashboard card
function updateTampilanCardKasWarga(sk, sf, m, k) {
    document.getElementById('totalSaldoKeseluruhan').innerText = sk.toLocaleString('id-ID');
    document.getElementById('totalSaldo').innerText = sf.toLocaleString('id-ID');
    document.getElementById('textMasuk').innerText = m.toLocaleString('id-ID');
    document.getElementById('textKeluar').innerText = k.toLocaleString('id-ID');
}

// Memuat Histori Iuran (Khusus Milik Warga Terotentikasi)
async function muatIuranSaya() {
    const res = await fetch(`${DB_URL}/iuran_sampah.json`);
    const data = await res.json();
    const list = document.getElementById('listIuranSaya');
    list.innerHTML = "";

    let adaData = false;
    if (data) {
        Object.keys(data).forEach(key => {
            const i = data[key];
            if (i.warga_key === KEY_WARGA_LOGGED_IN) {
                adaData = true;
                const linkKuitansi = `https://sikumel-ux.github.io/Tuntas/kuitansi/?id=${i.token_kuitansi}`;
                list.insertAdjacentHTML('afterbegin', `
                    <div class="p-4 flex justify-between items-center bg-white">
                        <div>
                            <h4 class="text-xs font-black text-slate-700 uppercase">IURAN BULAN ${i.bulan}</h4>
                            <p class="text-[9px] text-slate-400 font-bold mt-0.5">Tgl Bayar: ${i.tanggal} | Token: ${i.token_kuitansi}</p>
                        </div>
                        <div class="flex flex-col items-end gap-1">
                            <span class="text-xs font-black text-emerald-600">Rp ${i.nominal.toLocaleString('id-ID')}</span>
                            <a href="${linkKuitansi}" target="_blank" class="text-[9px] bg-slate-100 hover:bg-emerald-50 text-slate-700 font-black px-2 py-1 rounded border border-slate-200 uppercase tracking-wide"><i class="fa-solid fa-file-invoice"></i> Kuitansi</a>
                        </div>
                    </div>
                `);
            }
        });
    }
    if(!adaData) list.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 font-bold uppercase">Kamu belum memiliki riwayat iuran.</div>`;
}

// Memuat Log Pengangkutan Sampah Rumah Tangga Sendiri
async function muatSampahSaya() {
    const res = await fetch(`${DB_URL}/laporan_sampah.json`);
    const data = await res.json();
    const list = document.getElementById('listSampahSaya');
    list.innerHTML = "";

    let adaData = false;
    if (data) {
        Object.keys(data).forEach(key => {
            const s = data[key];
            if (s.warga_key === KEY_WARGA_LOGGED_IN) {
                adaData = true;
                let warnaStatus = "bg-slate-100 text-slate-700";
                if (s.status === 'diambil') warnaStatus = "bg-emerald-50 text-emerald-800 border-emerald-200";
                if (s.status === 'diantar') warnaStatus = "bg-teal-50 text-teal-800 border-teal-200";
                if (s.status === 'kosong') warnaStatus = "bg-rose-50 text-rose-800 border-rose-200";

                list.insertAdjacentHTML('afterbegin', `
                    <div class="p-4 flex justify-between items-center bg-white">
                        <div>
                            <h4 class="text-xs font-bold text-slate-700 uppercase">Jadwal Tanggal ${s.tanggal}</h4>
                            <p class="text-[9px] font-mono text-slate-400 mt-0.5">Jam Log: ${s.jam_diambil}</p>
                        </div>
                        <span class="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${warnaStatus}">
                            ${s.status}
                        </span>
                    </div>
                `);
            }
        });
    }
    if(!adaData) list.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 font-bold uppercase">Belum ada rekaman log sampah rumah.</div>`;
}

// Memuat Rilis Berita/Blog Publik dari Pengurus
async function muatBeritaWarga() {
    const res = await fetch(`${DB_URL}/pengumuman.json`);
    const data = await res.json();
    const list = document.getElementById('listBeritaWarga');
    list.innerHTML = ""; 
    
    if(!data) {
        list.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 font-bold uppercase bg-white rounded-2xl border border-slate-100">Belum ada berita terbaru.</div>`;
        return;
    }
    
    Object.keys(data).forEach(key => {
        list.insertAdjacentHTML('afterbegin', `
            <div class="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-1">
                <div class="flex justify-between items-center">
                    <h4 class="text-xs font-black text-slate-800 uppercase">${data[key].judul}</h4>
                    <span class="text-[8px] font-mono text-slate-400">${data[key].tanggal}</span>
                </div>
                <p class="text-xs text-slate-600 leading-relaxed font-semibold">${data[key].isi}</p>
            </div>
        `);
    });
}

// Mengirimkan Saran & Aspirasi Warga ke Node Database
function kirimSaranAspirasi(e) {
    e.preventDefault();
    const input = document.getElementById('isiSaranWarga');
    const body = {
        nama_warga: AKUN_WARGA_LOGGED_IN.nama,
        isi_saran: input.value.trim(),
        tanggal: new Date().toISOString().split('T')[0]
    };

    fetch(`${DB_URL}/saran_warga.json`, { 
        method: 'POST', 
        body: JSON.stringify(body) 
    }).then(() => {
        input.value = "";
        showNotif('Aspirasi berhasil dikirim!', 'sukses');
    }).catch(() => {
        showNotif('Gagal mengirim aspirasi', 'gagal');
    });
}

// Menjalankan Trigger Cek Pengumuman Pop-up Penting
async function jalankanPopupMaklumat() {
    const res = await fetch(`${DB_URL}/informasi_popup.json`);
    const data = await res.json();
    if(data && data.judul) {
        document.getElementById('popupWargaJudul').innerText = data.judul;
        document.getElementById('popupWargaIsi').innerText = data.isi;
        openModal('mInfoWargaPopup');
    }
}

// Alur Fungsi Keluar Aplikasi
function logoutWarga() {
    if(!confirm("Apakah anda ingin keluar dari aplikasi?")) return;
    localStorage.clear();
    KEY_WARGA_LOGGED_IN = null;
    AKUN_WARGA_LOGGED_IN = null;
    document.getElementById('loginHp').value = "";
    document.getElementById('loginPass').value = "";
    document.getElementById('scr-login').style.display = 'flex';
}

// Utilitas Pembantu Komponen Modal & Toast Notifikasi
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function showNotif(msg, type) {
    const box = document.getElementById('notificationAlert'); 
    const icon = document.getElementById('notifIcon'); 
    const text = document.getElementById('notifText'); 
    
    text.innerText = msg;
    box.className = `fixed top-4 left-1/2 -translate-x-1/2 w-11/12 max-w-sm z-[99999] p-4 rounded-2xl shadow-lg border text-xs font-black uppercase tracking-wide flex items-center gap-2.5 transition-all duration-300 ${type==='sukses'?'bg-emerald-50 border-emerald-200 text-emerald-800':'bg-rose-50 border-rose-200 text-rose-800'}`;
    icon.className = `fa-solid ${type==='sukses'?'fa-circle-check text-emerald-600':'fa-circle-xmark text-rose-600'} text-base`;
    
    box.classList.remove('hidden'); 
    setTimeout(() => box.classList.add('hidden'), 3000);
}
