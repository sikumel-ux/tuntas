/**
 * TUNTAS - Admin Panel Management Logic
 * Fixed Version: Berdasarkan Logika Login Warga yang Berhasil
 */

const DB_URL = "https://tuntas-04-default-rtdb.asia-southeast1.firebasedatabase.app";

window.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    cekSessionAdmin();
});

function initEventListeners() {
    // Form Submissions
    document.getElementById('formLoginAdmin').addEventListener('submit', prosesLoginAdmin);
    document.getElementById('formTransaksiKas').addEventListener('submit', simpanTransaksiKas);
    document.getElementById('formWargaBaru').addEventListener('submit', simpanWargaBaru);
    document.getElementById('formSampahAdmin').addEventListener('submit', simpanLogSampah);
    document.getElementById('formIuranAdmin').addEventListener('submit', simpanIuranWarga);
    document.getElementById('formBeritaAdmin').addEventListener('submit', simpanBerita);
    document.getElementById('formPopupAdmin').addEventListener('submit', simpanPopupMaklumat);

    // Buttons & Toggles
    document.getElementById('btnRefresh').addEventListener('click', sinkronUlangAdmin);
    document.getElementById('btnLogout').addEventListener('click', logoutAdmin);
    document.getElementById('btnBukaModalKas').addEventListener('click', () => openModal('modalInputKas'));
    document.getElementById('btnBukaModalWarga').addEventListener('click', () => openModal('modalTambahWarga'));
    document.getElementById('btnTogglePass').addEventListener('click', togglePasswordView);

    // Filters
    document.getElementById('filterMulai').addEventListener('change', muatBukuKasAdmin);
    document.getElementById('filterSelesai').addEventListener('change', muatBukuKasAdmin);

    // Navigation Tabs
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchAdminTab(btn.getAttribute('data-target'), e));
    });
}

function cekSessionAdmin() {
    if (localStorage.getItem('admin_logged_in') === 'true') {
        document.getElementById('scr-login-admin').style.display = 'none';

        // Set default filter bulan ini (Juni 2026)
        const hariIni = new Date();
        const y = hariIni.getFullYear();
        const m = String(hariIni.getMonth() + 1).padStart(2, '0');
        document.getElementById('filterMulai').value = `${y}-${m}-01`;
        document.getElementById('filterSelesai').value = hariIni.toISOString().split('T')[0];

        sinkronUlangAdmin();
    } else {
        document.getElementById('scr-login-admin').style.display = 'flex';
    }
}

// ==========================================
// FIX LOGIN ADMIN (SAMA DENGAN LOGIKA WARGA)
// ==========================================
async function prosesLoginAdmin(e) {
    e.preventDefault();
    document.getElementById('loadingOverlay').style.display = 'flex';
    
    const hp = document.getElementById('loginUsername').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();

    try {
        const res = await fetch(`${DB_URL}/admin_account.json`);
        const data = await res.json();
        
        let ketemu = false;
        
        if (data) {
            Object.keys(data).forEach(key => {
                if (data[key].username === hp && data[key].password === pass) {
                    ketemu = true;
                    localStorage.setItem('admin_logged_in', 'true');
                    localStorage.setItem('KEY_ADMIN_LOGGED_IN', key);
                    localStorage.setItem('AKUN_ADMIN_LOGGED_IN', JSON.stringify(data[key]));
                }
            });
        }

        if (ketemu) {
            document.getElementById('scr-login-admin').style.display = 'none';
            showNotif('Login Admin Berhasil!', 'sukses');
            cekSessionAdmin();
        } else {
            showNotif('No HP atau Password Admin Salah!', 'gagal');
        }
    } catch (err) {
        console.error("Login Admin Error:", err);
        showNotif('Gagal terhubung ke database', 'gagal');
    } finally {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}

function togglePasswordView() {
    const passInput = document.getElementById('loginPassword');
    const eyeIcon = document.getElementById('eyeIcon');
    
    if (passInput.type === 'password') {
        passInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        passInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

// ==========================================
// CORE DATA SYNC & NAVIGATION
// ==========================================
async function sinkronUlangAdmin() {
    if (localStorage.getItem('admin_logged_in') !== 'true') return;
    document.getElementById('loadingOverlay').style.display = 'flex';
    
    try {
        await Promise.all([
            muatBukuKasAdmin(),
            muatDataWargaAdmin(),
            muatSaranAdmin(),
            muatSelectDropdownWarga(),
            muatFormKontenPopup()
        ]);
    } catch (error) {
        console.error("Sync Error:", error);
        showNotif("Koneksi bermasalah saat memuat data", "gagal");
    } finally {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}

function switchAdminTab(targetId, event) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(targetId).classList.add('active');
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

// ==========================================
// TAB 1: BUKU KAS RT 04
// ==========================================
async function muatBukuKasAdmin() {
    const res = await fetch(`${DB_URL}/kas_rt04.json`);
    const data = await res.json();
    const list = document.getElementById('listKasAdmin');
    list.innerHTML = "";

    let start = new Date(document.getElementById('filterMulai').value);
    let end = new Date(document.getElementById('filterSelesai').value);
    end.setHours(23, 59, 59, 999);

    let totalKeseluruhan = 0;
    let sldFilter = 0, mskFilter = 0, klrFilter = 0;

    if (!data) {
        list.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 font-bold uppercase">Buku kas masih kosong.</div>`;
        updateCardUiAdmin(0, 0, 0, 0);
        return;
    }

    Object.keys(data).forEach(key => {
        const v = data[key];
        const nom = parseInt(v.nominal) || 0;
        const tglItem = new Date(v.tanggal);

        if (v.jenis === 'masuk') { totalKeseluruhan += nom; } else { totalKeseluruhan -= nom; }

        if (tglItem >= start && tglItem <= end) {
            if (v.jenis === 'masuk') { mskFilter += nom; } else { klrFilter += nom; }
            sldFilter = mskFilter - klrFilter;

            list.insertAdjacentHTML('afterbegin', `
                <div class="p-4 flex justify-between items-center bg-white border-b border-slate-100">
                    <div>
                        <h4 class="text-xs font-black text-slate-700 uppercase tracking-wide">${v.keterangan}</h4>
                        <p class="text-[9px] font-mono text-slate-400 mt-0.5">${v.tanggal}</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-xs font-black ${v.jenis === 'masuk' ? 'text-emerald-600' : 'text-rose-600'}">
                            ${v.jenis === 'masuk' ? '+' : '-'} ${nom.toLocaleString('id-ID')}
                        </span>
                        <button onclick="hapusTransaksiKas('${key}')" class="text-slate-300 hover:text-rose-600 text-xs transition-colors">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `);
        }
    });

    updateCardUiAdmin(totalKeseluruhan, sldFilter, mskFilter, klrFilter);
}

function updateCardUiAdmin(sk, sf, m, k) {
    document.getElementById('totalSaldoKeseluruhan').innerText = "Rp " + sk.toLocaleString('id-ID');
    document.getElementById('totalSaldo').innerText = sf.toLocaleString('id-ID');
    document.getElementById('textMasuk').innerText = m.toLocaleString('id-ID');
    document.getElementById('textKeluar').innerText = k.toLocaleString('id-ID');
}

async function simpanTransaksiKas(e) {
    e.preventDefault();
    const body = {
        jenis: document.getElementById('kasJenis').value,
        nominal: parseInt(document.getElementById('kasNominal').value),
        keterangan: document.getElementById('kasKeterangan').value.trim().toUpperCase(),
        tanggal: document.getElementById('kasTanggal').value
    };

    await fetch(`${DB_URL}/kas_rt04.json`, { method: 'POST', body: JSON.stringify(body) });
    closeModal('modalInputKas');
    document.getElementById('formTransaksiKas').reset();
    showNotif('Transaksi Berhasil Tersimpan!', 'sukses');
    muatBukuKasAdmin();
}

async function hapusTransaksiKas(key) {
    if (!confirm("Hapus transaksi kas ini?")) return;
    await fetch(`${DB_URL}/kas_rt04/${key}.json`, { method: 'DELETE' });
    showNotif('Transaksi terhapus', 'sukses');
    muatBukuKasAdmin();
}

// ==========================================
// TAB 2: MANAGEMENT DATA WARGA
// ==========================================
async function muatDataWargaAdmin() {
    const res = await fetch(`${DB_URL}/warga_rt04.json`);
    const data = await res.json();
    const list = document.getElementById('listManageWarga');
    list.innerHTML = "";

    if (!data) {
        list.innerHTML = `<div class="p-4 text-center text-xs text-slate-400 font-bold uppercase">Belum ada data warga terdaftar.</div>`;
        return;
    }

    Object.keys(data).forEach(key => {
        const w = data[key];
        const bulanBergabung = w.bulan_bergabung || "Juni 2026"; 

        list.insertAdjacentHTML('beforeend', `
            <div class="p-4 flex justify-between items-center bg-white border-b border-slate-100">
                <div>
                    <h4 class="text-xs font-black text-slate-800 uppercase">${w.nama}</h4>
                    <p class="text-[9px] text-slate-400 font-bold mt-0.5">WA: ${w.username} | Gabung: ${bulanBergabung}</p>
                </div>
                <button onclick="hapusWarga('${key}')" class="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors">
                    <i class="fa-solid fa-user-xmark text-xs"></i>
                </button>
            </div>
        `);
    });
}

async function simpanWargaBaru(e) {
    e.preventDefault();
    const body = {
        nama: document.getElementById('addNama').value.trim().toUpperCase(),
        username: document.getElementById('addHp').value.trim(),
        password: document.getElementById('addPass').value.trim(),
        bulan_bergabung: document.getElementById('addBulan').value.trim(),
        foto: "default.png"
    };

    await fetch(`${DB_URL}/warga_rt04.json`, { method: 'POST', body: JSON.stringify(body) });
    closeModal('modalTambahWarga');
    document.getElementById('formWargaBaru').reset();
    document.getElementById('addPass').value = "tuntas04";
    showNotif('Warga Baru Berhasil Didaftarkan!', 'sukses');
    sinkronUlangAdmin();
}

async function hapusWarga(key) {
    if (!confirm("Apakah anda yakin ingin menghapus warga ini dari sistem?")) return;
    await fetch(`${DB_URL}/warga_rt04/${key}.json`, { method: 'DELETE' });
    showNotif('Data warga terhapus', 'sukses');
    sinkronUlangAdmin();
}

// ==========================================
// TAB 3: OPERASIONAL LOG SAMPAH
// ==========================================
async function simpanLogSampah(e) {
    e.preventDefault();
    const select = document.getElementById('logSampahWargaSelect');
    const body = {
        tanggal: document.getElementById('logSampahTanggal').value,
        warga_key: select.value,
        nama_warga: select.options[select.selectedIndex].text,
        status: document.getElementById('logSampahStatus').value,
        jam_diambil: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + " WIB"
    };

    await fetch(`${DB_URL}/laporan_sampah.json`, { method: 'POST', body: JSON.stringify(body) });
    document.getElementById('formSampahAdmin').reset();
    showNotif('Log Sampah Rumah Berhasil Disimpan!', 'sukses');
}

// ==========================================
// TAB 4: MANAGEMENT IURAN & BERITA
// ==========================================
async function simpanIuranWarga(e) {
    e.preventDefault();
    const select = document.getElementById('iuranWargaSelect');
    const token = "T-" + Math.floor(100000 + Math.random() * 900000);
    const body = {
        warga_key: select.value,
        nama_warga: select.options[select.selectedIndex].text,
        bulan: document.getElementById('iuranBulan').value.trim().toUpperCase(),
        nominal: parseInt(document.getElementById('iuranNominal').value),
        tanggal: document.getElementById('iuranTanggal').value,
        token_kuitansi: token
    };

    await fetch(`${DB_URL}/iuran_sampah.json`, { method: 'POST', body: JSON.stringify(body) });
    document.getElementById('formIuranAdmin').reset();
    document.getElementById('iuranNominal').value = "20000";
    showNotif(`Iuran Sukses! Token: ${token}`, 'sukses');
}

async function simpanBerita(e) {
    e.preventDefault();
    const body = {
        judul: document.getElementById('newsJudul').value.trim().toUpperCase(),
        isi: document.getElementById('newsIsi').value.trim(),
        tanggal: new Date().toISOString().split('T')[0]
    };

    await fetch(`${DB_URL}/pengumuman.json`, { method: 'POST', body: JSON.stringify(body) });
    document.getElementById('formBeritaAdmin').reset();
    showNotif('Berita berhasil terpublish!', 'sukses');
}

async function muatSelectDropdownWarga() {
    const res = await fetch(`${DB_URL}/warga_rt04.json`);
    const data = await res.json();
    
    const selSampah = document.getElementById('logSampahWargaSelect');
    const selIuran = document.getElementById('iuranWargaSelect');
    
    selSampah.innerHTML = ""; selIuran.innerHTML = "";

    if (data) {
        Object.keys(data).forEach(key => {
            const opt = `<option value="${key}">${data[key].nama}</option>`;
            selSampah.insertAdjacentHTML('beforeend', opt);
            selIuran.insertAdjacentHTML('beforeend', opt);
        });
    }
}

// ==========================================
// TAB 5: BANNER POP-UP & ASPIRASI WARGA
// ==========================================
async function muatSaranAdmin() {
    const res = await fetch(`${DB_URL}/saran_warga.json`);
    const data = await res.json();
    const list = document.getElementById('listSaranAdmin');
    list.innerHTML = "";

    if (!data) {
        list.innerHTML = `<div class="p-4 text-center text-xs text-slate-400 font-bold uppercase bg-white rounded-2xl border border-slate-100">Belum ada saran aspirasi masuk.</div>`;
        return;
    }

    Object.keys(data).forEach(key => {
        const s = data[key];
        list.insertAdjacentHTML('afterbegin', `
            <div class="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-1">
                <div class="flex justify-between items-center">
                    <span class="text-[10px] font-black text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded uppercase">${s.nama_warga}</span>
                    <span class="text-[8px] font-mono text-slate-400">${s.tanggal}</span>
                </div>
                <p class="text-xs text-slate-600 font-semibold leading-relaxed">${s.isi_saran}</p>
                <div class="text-right pt-1">
                    <button onclick="hapusSaran('${key}')" class="text-[9px] text-rose-600 font-bold uppercase hover:underline">
                        <i class="fa-solid fa-trash-can"></i> Hapus Aspirasi
                    </button>
                </div>
            </div>
        `);
    });
}

async function hapusSaran(key) {
    if (!confirm("Hapus aspirasi masuk warga ini?")) return;
    await fetch(`${DB_URL}/saran_warga/${key}.json`, { method: 'DELETE' });
    showNotif('Aspirasi terhapus', 'sukses');
    muatSaranAdmin();
}

async function muatFormKontenPopup() {
    const res = await fetch(`${DB_URL}/informasi_popup.json`);
    const data = await res.json();
    if (data) {
        document.getElementById('popJudul').value = data.judul || "";
        document.getElementById('popIsi').value = data.isi || "";
    }
}

async function simpanPopupMaklumat(e) {
    e.preventDefault();
    const body = {
        judul: document.getElementById('popJudul').value.trim().toUpperCase(),
        isi: document.getElementById('popIsi').value.trim(),
        tanggal: new Date().toISOString().split('T')[0]
    };

    await fetch(`${DB_URL}/informasi_popup.json`, { method: 'PUT', body: JSON.stringify(body) });
    showNotif('Pop-up Maklumat Diperbarui!', 'sukses');
}

// ==========================================
// MODALS & UTILITIES
// ==========================================
function logoutAdmin() {
    if (!confirm("Keluar dari panel dashboard admin?")) return;
    localStorage.clear();
    document.getElementById('loginUsername').value = "";
    document.getElementById('loginPassword').value = "";
    document.getElementById('scr-login-admin').style.display = 'flex';
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function showNotif(msg, type) {
    const box = document.getElementById('notificationAlert'); 
    const icon = document.getElementById('notifIcon'); 
    const text = document.getElementById('notifText'); 
    text.innerText = msg;
    
    box.className = `fixed top-4 left-1/2 -translate-x-1/2 w-11/12 max-w-sm z-[99999] p-4 rounded-2xl shadow-lg border text-xs font-black uppercase tracking-wide flex items-center gap-2.5 transition-all duration-300 ${type === 'sukses' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`;
    icon.className = `fa-solid ${type === 'sukses' ? 'fa-circle-check text-emerald-600' : 'fa-circle-xmark text-rose-600'} text-base`;
    
    box.classList.remove('hidden'); 
    setTimeout(() => box.classList.add('hidden'), 3000);
}
