const DB_URL = "https://tuntas-04-default-rtdb.asia-southeast1.firebasedatabase.app";
let DATA_KAS_TERFILTER = []; 
let ACTION_HAPUS_CALLBACK = null;

// Register Service Worker untuk PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker terdaftar di scope: ', reg.scope))
            .catch(err => console.error('Pendaftaran Service Worker Gagal: ', err));
    });
}

window.addEventListener('DOMContentLoaded', () => {
    initDefaultTanggal();
    initEventListeners();
    
    sinkronUlangData().then(() => {
        jalankanPopupInfoOtomatis();
        muatFotoProfilAdmin(); 
    });
});

function initDefaultTanggal() {
    const hariIni = new Date();
    const y = hariIni.getFullYear();
    const m = String(hariIni.getMonth() + 1).padStart(2, '0');
    document.getElementById('filterMulai').value = `${y}-${m}-01`;
    document.getElementById('filterSelesai').value = hariIni.toISOString().split('T')[0];
    document.getElementById('iuranTgl').value = hariIni.toISOString().split('T')[0];
    document.getElementById('smphTgl').value = hariIni.toISOString().split('T')[0];
}

function initEventListeners() {
    // Navigasi & Tab
    document.getElementById('nav-btn-kas').addEventListener('click', () => switchTab('scr-kas'));
    document.getElementById('nav-btn-warga').addEventListener('click', () => switchTab('scr-warga'));
    document.getElementById('nav-btn-sampah').addEventListener('click', () => switchTab('scr-sampah'));
    document.getElementById('nav-btn-riwayat').addEventListener('click', () => switchTab('scr-riwayat'));
    document.getElementById('btn-top-modul').addEventListener('click', () => switchTab('scr-modul'));
    
    // Header Actions
    document.getElementById('btn-top-refresh').addEventListener('click', sinkronUlangData);
    document.getElementById('btn-top-logout').addEventListener('click', logoutAdmin);
    
    // Filter Kas
    document.getElementById('filterMulai').addEventListener('change', muatSistemKas);
    document.getElementById('filterSelesai').addEventListener('change', muatSistemKas);

    // Modal Triggers
    document.getElementById('btn-modal-kas').addEventListener('click', () => openModal('mInputKas'));
    document.getElementById('btn-modal-iuran').addEventListener('click', () => openModal('mInputIuran'));
    document.getElementById('nav-btn-iuran-quick').addEventListener('click', () => openModal('mInputIuran'));
    document.getElementById('btn-unduh-pdf').addEventListener('click', unduhLaporanPDF);
    document.getElementById('btn-trigger-foto').addEventListener('click', () => document.getElementById('inputFotoFile').click());
    document.getElementById('inputFotoFile').addEventListener('change', function() { prosesUploadFoto(this); });

    // Submit Forms
    document.getElementById('formKasUmum').addEventListener('submit', simpanKasUmum);
    document.getElementById('formIuran').addEventListener('submit', simpanIuran);
    document.getElementById('formWarga').addEventListener('submit', simpanWarga);
    document.getElementById('formSampah').addEventListener('submit', simpanSampah);
    document.getElementById('formInformasiPopup').addEventListener('submit', simpanInfoPopup);
    document.getElementById('formBerita').addEventListener('submit', simpanBerita);
    document.getElementById('formPass').addEventListener('submit', ubahPasswordAdmin);

    // Modal Closing Events
    document.getElementById('btnBatalHapus').addEventListener('click', () => closeModal('mKonfirmasiHapus'));
    document.getElementById('btnYakinHapus').addEventListener('click', () => {
        if(typeof ACTION_HAPUS_CALLBACK === 'function') ACTION_HAPUS_CALLBACK();
        closeModal('mKonfirmasiHapus');
    });

    document.querySelectorAll('.btn-close-popup').forEach(btn => btn.addEventListener('click', () => closeModal('mInfoLoginPopup')));
    document.querySelectorAll('.btn-close-kas').forEach(btn => btn.addEventListener('click', () => closeModal('mInputKas')));
    document.querySelectorAll('.btn-close-iuran').forEach(btn => btn.addEventListener('click', () => closeModal('mInputIuran')));

    document.querySelectorAll('.modal-closable-bg').forEach(m => {
        m.addEventListener('click', function(e) { if(e.target === this) closeModal(this.id); });
    });
}

function panggilKonfirmasiKustom(pesanText, callbackAksi) {
    document.getElementById('textKonfirmasiHapus').innerText = pesanText;
    ACTION_HAPUS_CALLBACK = callbackAksi;
    openModal('mKonfirmasiHapus');
}

async function sinkronUlangData() {
    document.getElementById('loadingOverlay').style.display = 'flex';
    try {
        await Promise.all([
            muatSistemKas(), 
            muatSistemWarga(), 
            muatRiwayatIuran(), 
            muatBeritaAdmin(), 
            muatSaranAdmin()
        ]);
    } catch (err) {
        console.error("Sinkronisasi database mengalami kendala:", err);
    } finally {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}

function switchTab(id) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('btn-top-modul').classList.remove('bg-emerald-950', 'text-white');
    document.getElementById('btn-top-modul').classList.add('bg-emerald-50', 'text-emerald-800');

    document.getElementById(id).classList.add('active');

    if (id === 'scr-kas') document.getElementById('nav-btn-kas').classList.add('active');
    else if (id === 'scr-warga') document.getElementById('nav-btn-warga').classList.add('active');
    else if (id === 'scr-sampah') document.getElementById('nav-btn-sampah').classList.add('active');
    else if (id === 'scr-riwayat') document.getElementById('nav-btn-riwayat').classList.add('active');
    else if (id === 'scr-modul') {
        document.getElementById('btn-top-modul').classList.remove('bg-emerald-50', 'text-emerald-800');
        document.getElementById('btn-top-modul').classList.add('bg-emerald-950', 'text-white');
    }
}

async function muatFotoProfilAdmin() {
    try {
        const res = await fetch(`${DB_URL}/admin_account/foto_profil.json`);
        const base64Image = await res.json();
        if (base64Image) document.getElementById('profFoto').src = base64Image;
    } catch (error) { console.log(error); }
}

function prosesUploadFoto(input) {
    if (input.files && input.files[0]) {
        document.getElementById('loadingOverlay').style.display = 'flex';
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = async function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const MAX_WIDTH = 400, MAX_HEIGHT = 400;
                let w = img.width, h = img.height;
                if (w > h) { if (w > MAX_WIDTH) { h *= MAX_WIDTH / w; w = MAX_WIDTH; } }
                else { if (h > MAX_HEIGHT) { w *= MAX_HEIGHT / h; h = MAX_HEIGHT; } }
                canvas.width = w; canvas.height = h;
                ctx.drawImage(img, 0, 0, w, h);
                const stringBase64 = canvas.toDataURL('image/jpeg', 0.7);
                try {
                    await fetch(`${DB_URL}/admin_account/foto_profil.json`, { method: 'PUT', body: JSON.stringify(stringBase64) });
                    document.getElementById('profFoto').src = stringBase64;
                    showNotif('Foto Profil Diperbarui!', 'sukses');
                } catch (err) { showNotif('Gagal mengunggah', 'gagal'); }
                finally { document.getElementById('loadingOverlay').style.display = 'none'; }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function muatSistemKas() {
    try {
        const res = await fetch(`${DB_URL}/kas_rt04.json`);
        const data = await res.json();
        const list = document.getElementById('listMutasiKasMasyarakat');
        list.innerHTML = "";
        let start = new Date(document.getElementById('filterMulai').value);
        let end = new Date(document.getElementById('filterSelesai').value);
        end.setHours(23,59,59,999);
        let sk = 0, sf = 0, m = 0, k = 0; DATA_KAS_TERFILTER = [];
        if(!data) {
            list.innerHTML = `<div class="p-4 text-center text-xs text-slate-400 font-bold uppercase">Buku Kas Kosong.</div>`;
            updateTampilanCardKas(0, 0, 0, 0); return;
        }
        Object.keys(data).forEach(key => {
            const v = data[key]; const nom = parseInt(v.nominal) || 0; const tglItem = new Date(v.tanggal);
            if(v.jenis === 'masuk') sk += nom; else sk -= nom;
            if(tglItem >= start && tglItem <= end) {
                if(v.jenis === 'masuk') m += nom; else k += nom;
                sf = m - k;
                DATA_KAS_TERFILTER.push({ tanggal: v.tanggal, keterangan: v.keterangan, jenis: v.jenis, nominal: nom });
                list.insertAdjacentHTML('afterbegin', `
                    <div class="p-4 flex justify-between items-center bg-white">
                        <div>
                            <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wide">${v.keterangan}</h4>
                            <p class="text-[9px] font-mono text-slate-400 mt-0.5">${v.tanggal}</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-xs font-black ${v.jenis==='masuk'?'text-emerald-600':'text-rose-600'}">
                                ${v.jenis==='masuk'?'Custom Alert +':'-'} ${nom.toLocaleString('id-ID')}
                            </span>
                            <button class="btn-hapus-kas text-slate-200 hover:text-rose-600 p-1" data-key="${key}"><i class="fa-solid fa-trash-can text-xs"></i></button>
                        </div>
                    </div>
                `);
            }
        });
        document.querySelectorAll('.btn-hapus-kas').forEach(btn => {
            btn.addEventListener('click', () => hapusKas(btn.getAttribute('data-key')));
        });
        updateTampilanCardKas(sk, sf, m, k);
    } catch (e) { console.error(e); }
}

function updateTampilanCardKas(sk, sf, m, k) {
    document.getElementById('totalSaldoKeseluruhan').innerText = "Rp " + sk.toLocaleString('id-ID');
    document.getElementById('totalSaldo').innerText = sf.toLocaleString('id-ID');
    document.getElementById('textMasuk').innerText = m.toLocaleString('id-ID');
    document.getElementById('textKeluar').innerText = k.toLocaleString('id-ID');
}

function simpanKasUmum(e) {
    e.preventDefault();
    const body = { jenis: document.getElementById('kasJenis').value, nominal: parseInt(document.getElementById('kasNominal').value)||0, keterangan: document.getElementById('kasKet').value.trim().toUpperCase(), tanggal: new Date().toISOString().split('T')[0] };
    fetch(`${DB_URL}/kas_rt04.json`, { method: 'POST', body: JSON.stringify(body) }).then(() => { closeModal('mInputKas'); document.getElementById('formKasUmum').reset(); showNotif('Kas Berhasil Dicatat', 'sukses'); muatSistemKas(); });
}

function hapusKas(key) {
    panggilKonfirmasiKustom('Hapus data transaksi mutasi kas ini dari pembukuan?', () => {
        fetch(`${DB_URL}/kas_rt04/${key}.json`, { method: 'DELETE' }).then(() => { showNotif('Transaksi berhasil dihapus', 'sukses'); muatSistemKas(); });
    });
}

function simpanIuran(e) {
    e.preventDefault();
    const token = `T-${Math.floor(100000 + Math.random() * 900000)}`;
    const drop = document.getElementById('iuranWarga'); const nWarga = drop.options[drop.selectedIndex].text;
    const bPeriode = document.getElementById('iuranBulan').value.trim().toUpperCase();
    const formatKeteranganIuran = `${nWarga} - ${bPeriode}`;
    const body = { tanggal: document.getElementById('iuranTgl').value, warga_key: drop.value, nama_warga: nWarga, bulan: bPeriode, nominal: parseInt(document.getElementById('iuranNominal').value)||0, token_kuitansi: token };

    fetch(`${DB_URL}/iuran_sampah.json`, { method: 'POST', body: JSON.stringify(body) }).then(() => {
        const kasKredit = { jenis: 'masuk', nominal: body.nominal, keterangan: formatKeteranganIuran, tanggal: body.tanggal };
        fetch(`${DB_URL}/kas_rt04.json`, { method: 'POST', body: JSON.stringify(kasKredit) }).then(() => { muatSistemKas(); muatRiwayatIuran(); });
        const linkKuitansi = `https://app.sekawan.my.id/kuitansi/?id=${token}`;
        document.getElementById('textKodeKuitansi').innerText = `TOKEN: ${token}\nURL: ${linkKuitansi}`;
        document.getElementById('boxKuitansiLink').classList.remove('hidden');
        document.getElementById('btnSalinKuitansi').onclick = () => { navigator.clipboard.writeText(linkKuitansi); showNotif('Link disalin!', 'sukses'); };
        document.getElementById('btnKirimWA').onclick = () => { window.open(`https://api.whatsapp.com/send?text=Terima+kasih+Bapak%2FIbu+${encodeURIComponent(nWarga)},+pembayaran+iuran+TUNTAS+sudah+diterima.+Kuitansi+digital:+${encodeURIComponent(linkKuitansi)}`, '_blank'); };
        closeModal('mInputIuran'); document.getElementById('formIuran').reset(); showNotif('Iuran Sukses Dicatat', 'sukses');
    });
}

function simpanInfoPopup(e) {
    e.preventDefault();
    const body = { judul: document.getElementById('popJudul').value.trim().toUpperCase(), isi: document.getElementById('popIsi').value.trim(), tanggal: new Date().toISOString().split('T')[0] };
    fetch(`${DB_URL}/informasi_popup.json`, { method: 'PUT', body: JSON.stringify(body) }).then(() => { showNotif('Info Pop-Up Diperbarui', 'sukses'); jalankanPopupInfoOtomatis(); });
}

async function jalankanPopupInfoOtomatis() {
    try {
        const res = await fetch(`${DB_URL}/informasi_popup.json`); const data = await res.json();
        if(data && data.judul) {
            document.getElementById('popupInfoJudul').innerText = data.judul;
            document.getElementById('popupInfoIsi').innerText = data.isi;
            openModal('mInfoLoginPopup');
        }
    } catch (err) { console.error(err); }
}

function simpanBerita(e) {
    e.preventDefault();
    const body = { judul: document.getElementById('newsJudul').value.trim().toUpperCase(), isi: document.getElementById('newsIsi').value.trim(), tanggal: new Date().toISOString().split('T')[0] };
    fetch(`${DB_URL}/pengumuman.json`, { method: 'POST', body: JSON.stringify(body) }).then(() => { document.getElementById('formBerita').reset(); showNotif('Rilis Blog Disiarkan', 'sukses'); muatBeritaAdmin(); });
}

async function muatBeritaAdmin() {
    try {
        const res = await fetch(`${DB_URL}/pengumuman.json`); const data = await res.json();
        const list = document.getElementById('listBeritaAdmin'); list.innerHTML = ""; if(!data) return;
        Object.keys(data).forEach(key => {
            list.insertAdjacentHTML('afterbegin', `
                <div class="p-2 bg-white rounded-lg border border-slate-100 mt-1">
                    <div class="flex justify-between items-center"><h5 class="text-[11px] font-black text-slate-800">${data[key].judul}</h5><button class="btn-hapus-berita text-slate-300 hover:text-rose-500 text-[10px]" data-key="${key}"><i class="fa-solid fa-trash-can"></i></button></div>
                    <p class="text-[11px] text-slate-500 mt-0.5 leading-tight">${data[key].isi}</p>
                </div>
            `);
        });
        document.querySelectorAll('.btn-hapus-berita').forEach(btn => {
            btn.addEventListener('click', () => hapusBerita(btn.getAttribute('data-key')));
        });
    } catch (e) { console.error(e); }
}

function hapusBerita(key) {
    panggilKonfirmasiKustom('Hapus postingan rilis blog pengumuman ini?', () => {
        fetch(`${DB_URL}/pengumuman/${key}.json`, { method: 'DELETE' }).then(() => { showNotif('Berita berhasil dihapus', 'sukses'); muatBeritaAdmin(); });
    });
}

async function muatSaranAdmin() {
    try {
        const res = await fetch(`${DB_URL}/saran_warga.json`); const data = await res.json();
        const list = document.getElementById('listSaranWargaAdmin'); list.innerHTML = "";
        if(!data) { list.innerHTML = `<div class="p-4 text-center text-xs text-slate-400 font-bold uppercase">Belum ada saran masuk.</div>`; return; }
        Object.keys(data).forEach(key => {
            list.insertAdjacentHTML('afterbegin', `
                <div class="p-2.5 my-1 bg-slate-50 rounded-xl border border-slate-100">
                    <div class="flex justify-between items-center text-[9px] font-black"><span class="text-emerald-800 uppercase">${data[key].nama_warga}</span><span class="text-slate-400">${data[key].tanggal}</span></div>
                    <p class="text-[11px] text-slate-600 italic mt-0.5">"${data[key].isi_saran}"</p>
                </div>
            `);
        });
    } catch (e) { console.error(e); }
}

async function muatSistemWarga() {
    try {
        const res = await fetch(`${DB_URL}/warga_rt04.json`); const data = await res.json();
        const list = document.getElementById('listWarga'); const d1 = document.getElementById('iuranWarga'); const d2 = document.getElementById('smphWarga');
        list.innerHTML = ""; d1.innerHTML = '<option value="">-- PILIH NAMA WARGA --</option>'; d2.innerHTML = '<option value="">-- PILIH NAMA WARGA --</option>';
        if(!data) return;
        Object.keys(data).forEach(key => {
            const w = data[key];
            d1.insertAdjacentHTML('beforeend', `<option value="${key}">${w.nama.toUpperCase()}</option>`);
            d2.insertAdjacentHTML('beforeend', `<option value="${key}">${w.nama.toUpperCase()}</option>`);
            list.insertAdjacentHTML('beforeend', `
                <div class="p-3 flex justify-between items-center bg-white my-1 rounded-xl border border-slate-100">
                    <div>
                        <p class="font-extrabold text-slate-700 uppercase tracking-wide">${w.nama}</p>
                        <p class="text-[9px] text-slate-400 font-mono">WA: ${w.username} | Reg: ${w.bulan_bergabung}</p>
                    </div>
                    <button class="btn-hapus-warga text-slate-200 hover:text-rose-600 p-1" data-key="${key}"><i class="fa-solid fa-user-xmark text-xs"></i></button>
                </div>
            `);
        });
        document.querySelectorAll('.btn-hapus-warga').forEach(btn => {
            btn.addEventListener('click', () => hapusWarga(btn.getAttribute('data-key')));
        });
    } catch (e) { console.error(e); }
}

function simpanWarga(e) {
    e.preventDefault();
    const body = { nama: document.getElementById('addNama').value.trim().toUpperCase(), username: document.getElementById('addHp').value.trim(), password: document.getElementById('addPass').value.trim(), bulan_bergabung: document.getElementById('addBulan').value.trim(), foto: "default.png" };
    fetch(`${DB_URL}/warga_rt04.json`, { method: 'POST', body: JSON.stringify(body) }).then(() => { document.getElementById('formWarga').reset(); showNotif('Warga Berhasil Didaftarkan', 'sukses'); muatSistemWarga(); });
}

function hapusWarga(key) {
    panggilKonfirmasiKustom('Hapus akun data warga ini secara permanen dari basis data?', () => {
        fetch(`${DB_URL}/warga_rt04/${key}.json`, { method: 'DELETE' }).then(() => { showNotif('Data warga terhapus', 'sukses'); muatSistemWarga(); });
    });
}

function simpanSampah(e) {
    e.preventDefault();
    const drop = document.getElementById('smphWarga');
    const body = { tanggal: document.getElementById('smphTgl').value, warga_key: drop.value, nama_warga: drop.options[drop.selectedIndex].text, status: document.getElementById('smphStatus').value, jam_diambil: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + " WIB" };
    fetch(`${DB_URL}/laporan_sampah.json`, { method: 'POST', body: JSON.stringify(body) }).then(() => { document.getElementById('formSampah').reset(); showNotif('Log Sampah Tersimpan', 'sukses'); });
}

async function muatRiwayatIuran() {
    try {
        const res = await fetch(`${DB_URL}/iuran_sampah.json`); const data = await res.json();
        const list = document.getElementById('listRiwayatIuranWarga'); list.innerHTML = ""; if(!data) { list.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 font-bold uppercase">Riwayat Kosong.</div>`; return; }
        Object.keys(data).forEach(key => {
            const i = data[key];
            list.insertAdjacentHTML('afterbegin', `
                <div class="p-4 flex justify-between items-center bg-white border border-slate-100/80 rounded-2xl my-2 shadow-sm hover:border-slate-200 transition-all">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center border border-slate-100">
                            <i class="fa-solid fa-receipt text-xs"></i>
                        </div>
                        <div>
                            <h4 class="text-xs font-extrabold text-slate-800 uppercase tracking-wide">${i.nama_warga}</h4>
                            <div class="flex items-center gap-1.5 mt-0.5">
                                <span class="text-[9px] text-slate-400 font-bold">${i.bulan}</span>
                                <span class="inline-block w-1 h-1 bg-slate-300 rounded-full"></span>
                                <span class="text-[8px] font-black bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded uppercase tracking-wider">Lunas</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3.5">
                        <div class="text-right">
                            <span class="text-xs font-black text-slate-900 block">Rp ${i.nominal.toLocaleString('id-ID')}</span>
                            <span class="text-[8px] font-mono text-slate-400 block tracking-tighter">ID: ${i.token_kuitansi}</span>
                        </div>
                        <button class="btn-hapus-iuran text-slate-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors" data-key="${key}" title="Hapus Riwayat">
                            <i class="fa-solid fa-trash-can text-xs"></i>
                        </button>
                    </div>
                </div>
            `);
        });
        document.querySelectorAll('.btn-hapus-iuran').forEach(btn => {
            btn.addEventListener('click', () => hapusIuran(btn.getAttribute('data-key')));
        });
    } catch (e) { console.error(e); }
}

function hapusIuran(key) {
    panggilKonfirmasiKustom('Hapus arsip data riwayat iuran sampah ini dari database?', () => {
        document.getElementById('loadingOverlay').style.display = 'flex';
        fetch(`${DB_URL}/iuran_sampah/${key}.json`, { method: 'DELETE' })
        .then(() => { showNotif('Riwayat iuran berhasil dihapus', 'sukses'); muatRiwayatIuran(); })
        .catch(() => showNotif('Gagal menghapus data', 'gagal'))
        .finally(() => document.getElementById('loadingOverlay').style.display = 'none');
    });
}

function unduhLaporanPDF() {
    if(DATA_KAS_TERFILTER.length === 0) { showNotif('Tidak ada transaksi pada rentang tanggal ini!', 'gagal'); return; }
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    doc.setFont("Helvetica", "bold"); doc.text("LAPORAN OPERASIONAL KAS TUNTAS RT 04", 14, 15);
    doc.setFontSize(9); doc.setFont("Helvetica", "normal");
    doc.text(`Periode: ${document.getElementById('filterMulai').value} s/d ${document.getElementById('filterSelesai').value}`, 14, 21);
    const rows = [];
    DATA_KAS_TERFILTER.forEach((item, idx) => { rows.push([idx + 1, item.tanggal, item.keterangan, item.jenis.toUpperCase(), item.nominal.toLocaleString('id-ID')]); });
    doc.autoTable({ startY: 26, head: [['No', 'Tanggal', 'Keterangan', 'Jenis', 'Nominal']], body: rows, headStyles: { fillColor: [6, 78, 59] } });
    doc.save(`Kas_Tuntas_RT04_${document.getElementById('filterMulai').value}.pdf`);
}

function ubahPasswordAdmin(e) {
    e.preventDefault();
    fetch(`${DB_URL}/admin_account/password.json`, { method: 'PUT', body: JSON.stringify(document.getElementById('newPass').value.trim()) }).then(() => { document.getElementById('formPass').reset(); showNotif('Password Admin Diperbarui', 'sukses'); });
}

function logoutAdmin() { localStorage.clear(); window.location.href = '../index.html'; }
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('remove'); document.getElementById(id).classList.remove('active'); }

function showNotif(msg, type) {
    const box = document.getElementById('notificationAlert'); const icon = document.getElementById('notifIcon'); const text = document.getElementById('notifText'); text.innerText = msg;
    box.className = `fixed top-4 left-1/2 -translate-x-1/2 w-11/12 max-w-sm z-[99999] p-4 rounded-2xl shadow-lg border text-xs font-black uppercase tracking-wide flex items-center gap-2.5 transition-all duration-300 ${type==='sukses'?'bg-emerald-50 border-emerald-200 text-emerald-800':'bg-rose-50 border-rose-200 text-rose-800'}`;
    icon.className = `fa-solid ${type==='sukses'?'fa-circle-check text-emerald-600':'fa-circle-xmark text-rose-600'} text-base`;
    box.classList.remove('hidden'); setTimeout(() => box.classList.add('hidden'), 3000);
}
