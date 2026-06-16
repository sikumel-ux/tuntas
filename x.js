const DB_URL = "https://tuntas-04-default-rtdb.asia-southeast1.firebasedatabase.app";

let AKUN_WARGA_LOGGED_IN = null;
let KEY_WARGA_LOGGED_IN = null;
let DATA_KAS_TERFILTER = []; 

window.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    cekSessionWarga();
});

function initEventListeners() {
    document.getElementById('formLoginWarga').addEventListener('submit', prosesLoginWarga);
    document.getElementById('formSaranWarga').addEventListener('submit', kirimSaranAspirasi);
    document.getElementById('formPassWarga').addEventListener('submit', perbaruiPasswordWarga);
    
    document.getElementById('btnRefresh').addEventListener('click', sinkronUlangWarga);
    document.getElementById('btnLogout').addEventListener('click', logoutWarga);
    document.getElementById('btnCetakPdf').addEventListener('click', unduhPdfKasWarga);
    document.getElementById('btnKonfirmasiWa').addEventListener('click', bukaKonfirmasiWa);
    
    document.getElementById('filterMulaiWarga').addEventListener('change', muatKasMasyarakat);
    document.getElementById('filterSelesaiWarga').addEventListener('change', muatKasMasyarakat);
    document.getElementById('inputFotoWarga').addEventListener('change', prosesUnggahFotoWarga);

    document.querySelectorAll('.btn-close-modal').forEach(button => {
        button.addEventListener('click', () => closeModal(button.getAttribute('data-target')));
    });

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
            
            this.classList.add('active');
            const target = this.getAttribute('data-target');
            document.getElementById(target).classList.add('active');
        });
    });
}

function toggleLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

function cekSessionWarga() {
    const saved = localStorage.getItem('warga_session');
    if(saved) {
        const parse = JSON.parse(saved);
        KEY_WARGA_LOGGED_IN = parse.key;
        AKUN_WARGA_LOGGED_IN = parse.data;
        masukKeDashboardWarga();
    }
}

async function prosesLoginWarga(e) {
    e.preventDefault();
    toggleLoading(true);
    const hp = document.getElementById('loginHp').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    
    try {
        const res = await fetch(`${DB_URL}/warga_account.json`);
        const data = await res.json();
        toggleLoading(false);
        
        let ketemu = false;
        if(data) {
            for(let key in data) {
                if(data[key].no_hp === hp && data[key].password === pass) {
                    ketemu = true;
                    KEY_WARGA_LOGGED_IN = key;
                    AKUN_WARGA_LOGGED_IN = data[key];
                    localStorage.setItem('warga_session', JSON.stringify({ key: key, data: data[key] }));
                    masukKeDashboardWarga();
                    showNotif('Selamat Datang Kembali!', 'sukses');
                    break;
                }
            }
        }
        if(!ketemu) showNotif('Nomor WhatsApp atau Password Salah!', 'gagal');
    } catch(err) {
        toggleLoading(false);
        showNotif('Koneksi Gagal, Coba Lagi!', 'gagal');
    }
}

function masukKeDashboardWarga() {
    document.getElementById('scr-login').style.display = 'none';
    document.getElementById('labelNamaWarga').innerText = AKUN_WARGA_LOGGED_IN.nama_warga;
    document.getElementById('namaWargaProfil').innerText = AKUN_WARGA_LOGGED_IN.nama_warga;
    document.getElementById('hpWargaProfil').innerText = AKUN_WARGA_LOGGED_IN.no_hp;
    
    const tglSaku = AKUN_WARGA_LOGGED_IN.tanggal_bergabung || "2025-01-01";
    const d = new Date(tglSaku);
    const opt = { month: 'short', year: 'numeric' };
    document.getElementById('labelBulanBergabung').innerText = d.toLocaleDateString('id-ID', opt);
    
    if(AKUN_WARGA_LOGGED_IN.foto_profil) {
        document.getElementById('imgProfilWarga').src = AKUN_WARGA_LOGGED_IN.foto_profil;
    }
    
    // Set default filter tanggal 30 hari ke belakang
    const selesai = new Date();
    const mulai = new Date();
    mulai.setDate(selesai.getDate() - 30);
    
    document.getElementById('filterMulaiWarga').value = mulai.toISOString().split('T')[0];
    document.getElementById('filterSelesaiWarga').value = selesai.toISOString().split('T')[0];
    
    sinkronUlangWarga();
    cekInfoPopupWarga();
}

function sinkronUlangWarga() {
    muatKasMasyarakat();
    muatIuranWargaSaya();
    muatKalenderSampahWarga();
    muatBeritaWarga();
}

async function muatKasMasyarakat() {
    const tglMulai = document.getElementById('filterMulaiWarga').value;
    const tglSelesai = document.getElementById('filterSelesaiWarga').value;
    if(!tglMulai || !tglSelesai) return;

    try {
        const res = await fetch(`${DB_URL}/mutasi_kas.json`);
        const data = await res.json();
        
        let tMasuk = 0, tKeluar = 0, akumulasiFiltered = 0, totalGlobal = 0;
        let html = '';
        DATA_KAS_TERFILTER = [];

        if(data) {
            let arr = [];
            for(let k in data) {
                if(data[k].jenis === 'masuk') totalGlobal += parseInt(data[k].nominal);
                if(data[k].jenis === 'keluar') totalGlobal -= parseInt(data[k].nominal);
                arr.push(data[k]);
            }
            
            // Urutkan tanggal terbaru di atas
            arr.sort((a,b) => new Date(b.tanggal) - new Date(a.tanggal));
            
            arr.forEach(item => {
                if(item.tanggal >= tglMulai && item.tanggal <= tglSelesai) {
                    DATA_KAS_TERFILTER.push(item);
                    const nom = parseInt(item.nominal);
                    if(item.jenis === 'masuk') { tMasuk += nom; akumulasiFiltered += nom; }
                    if(item.jenis === 'keluar') { tKeluar += nom; akumulasiFiltered -= nom; }
                    
                    html += `
                    <div class="p-3.5 flex justify-between items-center bg-white">
                        <div class="space-y-0.5">
                            <p class="text-xs font-black text-slate-800 uppercase tracking-tight">${item.keterangan}</p>
                            <p class="text-[9px] text-slate-400 font-mono font-bold">${formatTanggalIndo(item.tanggal)}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-xs font-black ${item.jenis==='masuk'?'text-emerald-600':'text-rose-500'}">
                                ${item.jenis==='masuk'?'+':'-'} ${formatRupiah(item.nominal)}
                            </p>
                        </div>
                    </div>`;
                }
            });
        }
        
        document.getElementById('totalSaldoKeseluruhan').innerText = formatRupiah(totalGlobal);
        document.getElementById('totalSaldo').innerText = formatRupiah(akumulasiFiltered);
        document.getElementById('textMasuk').innerText = formatRupiah(tMasuk);
        document.getElementById('textKeluar').innerText = formatRupiah(tKeluar);
        document.getElementById('listWargaKas').innerHTML = html || '<div class="p-6 text-center text-xs text-slate-400 font-bold uppercase">Tidak ada mutasi kas di rentang ini</div>';
    } catch(e){}
}

async function muatIuranWargaSaya() {
    try {
        const res = await fetch(`${DB_URL}/iuran_sampah.json`);
        const data = await res.json();
        let html = '';
        
        if(data && AKUN_WARGA_LOGGED_IN) {
            let arr = [];
            for(let k in data) {
                if(data[k].no_hp === AKUN_WARGA_LOGGED_IN.no_hp) arr.push(data[k]);
            }
            
            arr.sort((a,b) => b.tahun - a.tahun || b.bulan_angka - a.bulan_angka);
            
            arr.forEach(i => {
                html += `
                <div class="p-4 flex justify-between items-center bg-white">
                    <div class="space-y-0.5">
                        <h4 class="text-xs font-black text-slate-800 uppercase tracking-tight">Iuran Sampah ${i.bulan_nama} ${i.tahun}</h4>
                        <p class="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Petugas: ${i.nama_petugas}</p>
                    </div>
                    <div class="text-right space-y-1">
                        <span class="text-[9px] font-black bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-md uppercase border border-emerald-100 tracking-wide">Lunas</span>
                        <p class="text-xs font-black text-slate-800 tracking-tight">${formatRupiah(i.nominal)}</p>
                    </div>
                </div>`;
            });
        }
        document.getElementById('listIuranSaya').innerHTML = html || '<div class="p-6 text-center text-xs text-slate-400 font-bold uppercase">Belum ada riwayat pembayaran iuran</div>';
    } catch(e){}
}

async function muatKalenderSampahWarga() {
    const box = document.getElementById('boxKalenderSampahWarga');
    if(!box) return;
    
    // Default simulasi kalender Juni 2026 (30 Hari, Dimulai hari Senin)
    let html = '';
    try {
        const res = await fetch(`${DB_URL}/log_sampah/2026/06.json`);
        const data = await res.json() || {};
        
        for(let d=1; d<=30; d++) {
            const dayKey = d < 10 ? `0${d}` : `${d}`;
            const log = data[dayKey];
            
            let bgClass = 'bg-slate-50 text-slate-400 border border-slate-100';
            let clickAttr = '';
            
            if(log) {
                if(log.status === 'diambil') {
                    bgClass = 'bg-emerald-600 text-white shadow-sm';
                    clickAttr = `onclick="bukaDetailSampahWarga('2026-06-${dayKey}', '${log.jam}', 'diambil')"`;
                } else if(log.status === 'kosong') {
                    bgClass = 'bg-rose-100 text-rose-800 border border-rose-200';
                    clickAttr = `onclick="bukaDetailSampahWarga('2026-06-${dayKey}', '${log.jam}', 'kosong')"`;
                }
            }
            html += `<div class="day-box ${bgClass}" ${clickAttr}>${d}</div>`;
        }
        box.innerHTML = html;
    } catch(e){}
}

function bukaDetailSampahWarga(tgl, jam, status) {
    document.getElementById('dtlSampahTgl').innerText = formatTanggalIndo(tgl);
    document.getElementById('dtlSampahJam').innerText = jam + " WIB";
    
    const elSt = document.getElementById('dtlSampahStatus');
    elSt.innerText = status === 'diambil' ? 'Sampah Diambil' : 'Rumah Kosong';
    elSt.className = status === 'diambil' ? "font-black px-2 py-0.5 rounded uppercase tracking-wide text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100" : "font-black px-2 py-0.5 rounded uppercase tracking-wide text-[10px] bg-rose-50 text-rose-800 border border-rose-100";
    
    openModal('mDetailSampahWarga');
}

async function muatBeritaWarga() {
    try {
        const res = await fetch(`${DB_URL}/berita_rt.json`);
        const data = await res.json();
        let html = '';
        if(data) {
            let arr = [];
            for(let k in data) arr.push(data[k]);
            arr.sort((a,b) => new Date(b.tanggal) - new Date(a.tanggal));
            
            arr.forEach(b => {
                html += `
                <div class="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm space-y-1.5">
                    <span class="text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-wider">${formatTanggalIndo(b.tanggal)}</span>
                    <h4 class="text-xs font-black text-slate-800 uppercase tracking-tight">${b.judul}</h4>
                    <p class="text-xs text-slate-600 leading-relaxed font-medium">${b.isi}</p>
                </div>`;
            });
        }
        document.getElementById('listBeritaWarga').innerHTML = html || '<div class="p-6 text-center text-xs text-slate-400 font-bold uppercase bg-white rounded-2xl border">Belum ada rilis berita</div>';
    } catch(e){}
}

async function kirimSaranAspirasi(e) {
    e.preventDefault();
    toggleLoading(true);
    const isi = document.getElementById('isiSaranWarga').value.trim();
    
    const payload = {
        nama_warga: AKUN_WARGA_LOGGED_IN.nama_warga,
        no_hp: AKUN_WARGA_LOGGED_IN.no_hp,
        tanggal: new Date().toISOString().split('T')[0],
        isi_saran: isi
    };

    try {
        await fetch(`${DB_URL}/saran_warga.json`, { method: 'POST', body: JSON.stringify(payload) });
        toggleLoading(false);
        document.getElementById('formSaranWarga').reset();
        showNotif('Aspirasi Berhasil Dikirim Ke Pengurus!', 'sukses');
    } catch(err) {
        toggleLoading(false);
        showNotif('Gagal Mengirim Saran!', 'gagal');
    }
}

async function perbaruiPasswordWarga(e) {
    e.preventDefault();
    toggleLoading(true);
    const passBaru = document.getElementById('newPassWarga').value.trim();
    
    try {
        await fetch(`${DB_URL}/warga_account/${KEY_WARGA_LOGGED_IN}/password.json`, {
            method: 'PUT',
            body: JSON.stringify(passBaru)
        });
        toggleLoading(false);
        AKUN_WARGA_LOGGED_IN.password = passBaru;
        const session = JSON.parse(localStorage.getItem('warga_session'));
        session.data.password = passBaru;
        localStorage.setItem('warga_session', JSON.stringify(session));
        
        document.getElementById('formPassWarga').reset();
        showNotif('Password Akun Berhasil Diperbarui!', 'sukses');
    } catch(err) {
        toggleLoading(false);
        showNotif('Gagal Memperbarui Password!', 'gagal');
    }
}

function prosesUnggahFotoWarga(e) {
    const file = e.target.files[0];
    if(!file) return;
    
    toggleLoading(true);
    const reader = new FileReader();
    reader.onload = async function(evt) {
        const base64 = evt.target.result;
        try {
            await fetch(`${DB_URL}/warga_account/${KEY_WARGA_LOGGED_IN}/foto_profil.json`, {
                method: 'PUT',
                body: JSON.stringify(base64)
            });
            toggleLoading(false);
            document.getElementById('imgProfilWarga').src = base64;
            
            AKUN_WARGA_LOGGED_IN.foto_profil = base64;
            const session = JSON.parse(localStorage.getItem('warga_session'));
            session.data.foto_profil = base64;
            localStorage.setItem('warga_session', JSON.stringify(session));
            
            showNotif('Foto Profil Berhasil Diperbarui!', 'sukses');
        } catch(err) {
            toggleLoading(false);
            showNotif('Gagal Mengunggah Foto!', 'gagal');
        }
    };
    reader.readAsDataURL(file);
}

function bukaKonfirmasiWa() {
    if(!AKUN_WARGA_LOGGED_IN) return;
    const txt = `Halo Pengurus TUNTAS RT 04,%0A%0ASaya ingin mengonfirmasi pembayaran iuran sampah.%0A%0ANama: *${AKUN_WARGA_LOGGED_IN.nama_warga}*%0ANo. HP: ${AKUN_WARGA_LOGGED_IN.no_hp}%0A%0AMohon dicek pada sistem admin. Terima kasih!`;
    window.open(`https://wa.me/628123456789?text=${txt}`, '_blank');
}

function unduhPdfKasWarga() {
    if(DATA_KAS_TERFILTER.length === 0) {
        showNotif('Tidak ada data mutasi untuk dicetak!', 'gagal');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.text("LAPORAN MUTASI KAS TUNTAS RT 04 DONGKELAN", 14, 15);
    doc.setFontSize(10);
    doc.text(`Filter Tanggal: ${document.getElementById('filterMulaiWarga').value} s/d ${document.getElementById('filterSelesaiWarga').value}`, 14, 22);
    
    const body = DATA_KAS_TERFILTER.map(i => [
        formatTanggalIndo(i.tanggal),
        i.keterangan.toUpperCase(),
        i.jenis === 'masuk' ? formatRupiah(i.nominal) : '-',
        i.jenis === 'keluar' ? formatRupiah(i.nominal) : '-'
    ]);
    
    doc.autoTable({
        startY: 28,
        head: [['Tanggal', 'Keterangan', 'Pemasukan', 'Pengeluaran']],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [6, 78, 59] }
    });
    
    doc.save(`Kas_Tuntas_Warga_${document.getElementById('filterMulaiWarga').value}.pdf`);
    showNotif('Berkas PDF Berhasil Diunduh!', 'sukses');
}

async function cekInfoPopupWarga() {
    try {
        const res = await fetch(`${DB_URL}/informasi_popup.json`);
        const data = await res.json();
        if(data && data.judul) {
            document.getElementById('popupWargaJudul').innerText = data.judul;
            document.getElementById('popupWargaIsi').innerText = data.isi;
            openModal('mInfoWargaPopup');
        }
    } catch(e){}
}

// ==========================================
// SYSTEM CUSTOM NOTIFIKASI UPGRADE V2 (4.js)
// ==========================================
let timerNotifWarga = null;

function showNotif(msg, type) {
    const box = document.getElementById('notificationAlert');
    const icon = document.getElementById('notifIcon');
    const text = document.getElementById('notifText');
    
    if(!box || !icon || !text) return;
    if(timerNotifWarga) clearTimeout(timerNotifWarga);
    
    text.innerText = msg;
    
    if (type === 'sukses') {
        box.className = "fixed top-6 left-1/2 -translate-x-1/2 w-11/12 max-w-sm z-[99999] p-4 rounded-2xl shadow-xl border bg-emerald-50 border-emerald-200 text-emerald-900 font-extrabold uppercase tracking-wide flex items-center gap-3 transition-all duration-300 transform translate-y-0 opacity-100";
        icon.className = "fa-solid fa-circle-check text-emerald-600 text-lg animate-bounce";
    } else {
        box.className = "fixed top-6 left-1/2 -translate-x-1/2 w-11/12 max-w-sm z-[99999] p-4 rounded-2xl shadow-xl border bg-rose-50 border-rose-200 text-rose-900 font-extrabold uppercase tracking-wide flex items-center gap-3 transition-all duration-300 transform translate-y-0 opacity-100";
        icon.className = "fa-solid fa-circle-xmark text-rose-600 text-lg animate-shake";
    }
    
    box.classList.remove('hidden');
    
    timerNotifWarga = setTimeout(() => {
        box.classList.add('opacity-0', '-translate-y-4'); 
        setTimeout(() => {
            box.classList.add('hidden');
            box.classList.remove('opacity-0', '-translate-y-4');
        }, 300);
    }, 3000);
}

function logoutWarga() {
    localStorage.clear();
    KEY_WARGA_LOGGED_IN = null;
    AKUN_WARGA_LOGGED_IN = null;
    
    showNotif('Berhasil keluar dari aplikasi', 'sukses');
    
    setTimeout(() => {
        const scrLogin = document.getElementById('scr-login');
        if(scrLogin) {
            scrLogin.style.display = 'flex';
            scrLogin.classList.add('animate-fade-in');
        }
    }, 800);
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function formatRupiah(num) {
    return "Rp " + parseInt(num).toLocaleString('id-ID');
}

function formatTanggalIndo(tglStr) {
    if(!tglStr) return '-';
    const d = new Date(tglStr);
    const opt = { day: 'numeric', month: 'long', year: 'numeric' };
    return d.toLocaleDateString('id-ID', opt);
}
