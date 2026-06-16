const DB_URL = "https://tuntas-04-default-rtdb.asia-southeast1.firebasedatabase.app";

let AKUN_WARGA_LOGGED_IN = null;
let KEY_WARGA_LOGGED_IN = null;
let DATA_KAS_TERFILTER = []; // Tampungan global untuk cetak PDF

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
        btn.addEventListener('click', () => switchWargaTab(btn.getAttribute('data-target')));
    });
}

// Fungsi Helper untuk merubah YYYY-MM-DD menjadi DD-MM-YYYY
function formatTanggalIndo(tglStr) {
    if (!tglStr) return "-";
    // Jika formatnya sudah DD-MM-YYYY atau mengandung slash, kembalikan langsung
    if (tglStr.includes('-') && tglStr.split('-')[0].length === 2) return tglStr;
    
    const parts = tglStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return tglStr;
}

function cekSessionWarga() {
    const savedKey = localStorage.getItem('warga_key');
    const savedData = localStorage.getItem('warga_data');
    
    if (savedKey && savedData) {
        KEY_WARGA_LOGGED_IN = savedKey;
        AKUN_WARGA_LOGGED_IN = JSON.parse(savedData);
        
        document.getElementById('scr-login').style.display = 'none';
        document.getElementById('labelNamaWarga').innerText = AKUN_WARGA_LOGGED_IN.nama;
        document.getElementById('labelBulanBergabung').innerText = AKUN_WARGA_LOGGED_IN.bulan_bergabung || 'Juni 2026';
        
        // Atur Info Profil Screen
        document.getElementById('namaWargaProfil').innerText = AKUN_WARGA_LOGGED_IN.nama;
        document.getElementById('hpWargaProfil').innerText = "WA: " + AKUN_WARGA_LOGGED_IN.username;
        if (AKUN_WARGA_LOGGED_IN.foto && AKUN_WARGA_LOGGED_IN.foto !== 'default.png') {
            document.getElementById('imgProfilWarga').src = AKUN_WARGA_LOGGED_IN.foto;
        }

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
            showNotif('Login Berhasil!', 'sukses');
            cekSessionWarga();
        } else {
            showNotif('No WA atau Password Salah', 'gagal');
        }
    } catch (err) {
        showNotif('Gagal terhubung ke database', 'gagal');
    } finally {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}

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

function switchWargaTab(id) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(id).classList.add('active');
    
    const map = {'scr-w-kas': 'nav-btn-w-kas', 'scr-w-iuran': 'nav-btn-w-iuran', 'scr-w-sampah': 'nav-btn-w-sampah', 'scr-w-berita': 'nav-btn-w-berita', 'scr-w-profil': 'nav-btn-w-profil'};
    if (map[id]) document.getElementById(map[id]).classList.add('active');
}

async function muatKasMasyarakat() {
    const res = await fetch(`${DB_URL}/kas_rt04.json`);
    const data = await res.json();
    const list = document.getElementById('listWargaKas');
    list.innerHTML = "";
    DATA_KAS_TERFILTER = [];

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

        if(v.jenis === 'masuk') { saldoKeseluruhan += nom; } else { saldoKeseluruhan -= nom; }

        if(tglItem >= start && tglItem <= end) {
            if(v.jenis === 'masuk') { mskTerapit += nom; } else { klrTerapit += nom; }
            sldTerapit = mskTerapit - klrTerapit;

            DATA_KAS_TERFILTER.push(v);

            list.insertAdjacentHTML('afterbegin', `
                <div class="p-4 flex justify-between items-center bg-white">
                    <div>
                        <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wide">${v.keterangan}</h4>
                        <p class="text-[9px] font-mono text-slate-400 mt-0.5">${formatTanggalIndo(v.tanggal)}</p>
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

function updateTampilanCardKasWarga(sk, sf, m, k) {
    document.getElementById('totalSaldoKeseluruhan').innerText = sk.toLocaleString('id-ID');
    document.getElementById('totalSaldo').innerText = sf.toLocaleString('id-ID');
    document.getElementById('textMasuk').innerText = m.toLocaleString('id-ID');
    document.getElementById('textKeluar').innerText = k.toLocaleString('id-ID');
}

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
                const linkKuitansi = `https://app.sekawan.my.id/kuitansi/?id=${i.token_kuitansi}`;
                list.insertAdjacentHTML('afterbegin', `
                    <div class="p-4 flex justify-between items-center bg-white">
                        <div>
                            <h4 class="text-xs font-black text-slate-700 uppercase">IURAN BULAN ${i.bulan}</h4>
                            <p class="text-[9px] text-slate-400 font-bold mt-0.5">Tgl Bayar: ${formatTanggalIndo(i.tanggal)} | Token: ${i.token_kuitansi}</p>
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

async function muatSampahSaya() {
    const res = await fetch(`${DB_URL}/laporan_sampah.json`);
    const data = await res.json();
    const boxKalender = document.getElementById('boxKalenderSampahWarga');
    if (!boxKalender) return;
    
    boxKalender.innerHTML = "";
    const mapSampahJuni = {};

    if (data) {
        Object.keys(data).forEach(key => {
            const s = data[key];
            if (s.warga_key === KEY_WARGA_LOGGED_IN && s.tanggal) {
                const partTgl = s.tanggal.split('-');
                if (partTgl[0] === "2026" && partTgl[1] === "06") {
                    const tanggalAngka = parseInt(partTgl[2]);
                    mapSampahJuni[tanggalAngka] = {
                        jam: s.jam_diambil || "Malam Hari",
                        status: s.status || "diambil"
                    };
                }
            }
        });
    }

    for (let i = 1; i <= 30; i++) {
        let classWarna = "bg-slate-100 text-slate-700 hover:bg-slate-200";

        if (mapSampahJuni[i]) {
            const stat = mapSampahJuni[i].status.toLowerCase();
            if (stat === 'diambil' || stat === 'diantar') {
                classWarna = "bg-emerald-600 text-white shadow-sm font-extrabold";
            } else if (stat === 'kosong') {
                classWarna = "bg-rose-100 text-rose-800 border border-rose-200";
            }
        }

        const jamLog = mapSampahJuni[i] ? mapSampahJuni[i].jam : "-";
        const statusLog = mapSampahJuni[i] ? mapSampahJuni[i].status : "Belum Ada Log";

        boxKalender.insertAdjacentHTML('beforeend', `
            <div class="day-box ${classWarna}" onclick="bukaDetailSampahKalender('${i}', '${jamLog}', '${statusLog}')">
                ${i}
            </div>
        `);
    }
}

function bukaDetailSampahKalender(tanggal, jam, status) {
    // Format tanggal pada modal detail sampah: DD-MM-YYYY
    const tglDuaDigit = String(tanggal).padStart(2, '0');
    document.getElementById('dtlSampahTgl').innerText = `${tglDuaDigit}-06-2026`;
    document.getElementById('dtlSampahJam').innerText = jam;
    
    const statusEl = document.getElementById('dtlSampahStatus');
    statusEl.innerText = status;
    
    statusEl.className = "font-black px-2 py-0.5 rounded uppercase tracking-wide text-[10px]";
    if(status === 'diambil' || status === 'diantar') {
        statusEl.classList.add('bg-emerald-100', 'text-emerald-800');
    } else if(status === 'kosong') {
        statusEl.classList.add('bg-rose-100', 'text-rose-800');
    } else {
        statusEl.classList.add('bg-slate-100', 'text-slate-600');
    }

    openModal('mDetailSampahWarga');
}

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
                    <span class="text-[8px] font-mono text-slate-400">${formatTanggalIndo(data[key].tanggal)}</span>
                </div>
                <p class="text-xs text-slate-600 leading-relaxed font-semibold">${data[key].isi}</p>
            </div>
        `);
    });
}

function prosesUnggahFotoWarga(e) {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('loadingOverlay').style.display = 'flex';
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function (event) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = function () {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 400;
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

            // Simpan ke Firebase
            fetch(`${DB_URL}/warga_rt04/${KEY_WARGA_LOGGED_IN}/foto.json`, {
                method: 'PUT',
                body: JSON.stringify(compressedBase64)
            }).then(() => {
                AKUN_WARGA_LOGGED_IN.foto = compressedBase64;
                localStorage.setItem('warga_data', JSON.stringify(AKUN_WARGA_LOGGED_IN));
                document.getElementById('imgProfilWarga').src = compressedBase64;
                showNotif('Foto Profil Berhasil Diperbarui!', 'sukses');
            }).finally(() => {
                document.getElementById('loadingOverlay').style.display = 'none';
            });
        };
    };
}

function perbaruiPasswordWarga(e) {
    e.preventDefault();
    const newPass = document.getElementById('newPassWarga').value.trim();
    document.getElementById('loadingOverlay').style.display = 'flex';

    fetch(`${DB_URL}/warga_rt04/${KEY_WARGA_LOGGED_IN}/password.json`, {
        method: 'PUT',
        body: JSON.stringify(newPass)
    }).then(() => {
        AKUN_WARGA_LOGGED_IN.password = newPass;
        localStorage.setItem('warga_data', JSON.stringify(AKUN_WARGA_LOGGED_IN));
        document.getElementById('formPassWarga').reset();
        showNotif('Password Berhasil Diperbarui!', 'sukses');
    }).finally(() => {
        document.getElementById('loadingOverlay').style.display = 'none';
    });
}

function bukaKonfirmasiWa() {
    const teks = encodeURIComponent(`Halo Pengurus TUNTAS RT 04, saya ${AKUN_WARGA_LOGGED_IN.nama} ingin konfirmasi bahwa saya telah melakukan transfer iuran sampah/kas. Mohon untuk dicek, terima kasih.`);
    window.open(`https://wa.me/6285163233482?text=${teks}`, '_blank'); 
}

function kirimSaranAspirasi(e) {
    e.preventDefault();
    const input = document.getElementById('isiSaranWarga');
    const tglHariIni = new Date().toISOString().split('T')[0]; // Tetap YYYY-MM-DD untuk DB

    const body = {
        nama_warga: AKUN_WARGA_LOGGED_IN.nama,
        isi_saran: input.value.trim(),
        tanggal: tglHariIni
    };

    fetch(`${DB_URL}/saran_warga.json`, { 
        method: 'POST', 
        body: JSON.stringify(body) 
    }).then(() => {
        input.value = "";
        showNotif('Berhasil dikirim!', 'sukses');
    });
}

function unduhPdfKasWarga() {
    if (DATA_KAS_TERFILTER.length === 0) {
        showNotif('Tidak ada data kas untuk dicetak!', 'gagal');
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Convert format filter untuk sub-header PDF
    const tglMulaiIndo = formatTanggalIndo(document.getElementById('filterMulaiWarga').value);
    const tglSelesaiIndo = formatTanggalIndo(document.getElementById('filterSelesaiWarga').value);

    doc.setFont("Helvetica", "bold");
    doc.text("LAPORAN MUTASI KAS TUNTAS", 14, 15);
    doc.setFontSize(9);
    doc.setFont("Helvetica", "normal");
    doc.text(`Periode: ${tglMulaiIndo} s/d ${tglSelesaiIndo}`, 14, 21);
    doc.text(`Diunduh oleh Warga: ${AKUN_WARGA_LOGGED_IN.nama}`, 14, 25);

    const rows = [];
    const sortedData = [...DATA_KAS_TERFILTER].reverse();
    sortedData.forEach(item => {
        rows.push([
            formatTanggalIndo(item.tanggal), // Format Indonesia di dalam tabel PDF
            item.keterangan.toUpperCase(),
            item.jenis === 'masuk' ? `Rp ${parseInt(item.nominal).toLocaleString('id-ID')}` : '-',
            item.jenis === 'keluar' ? `Rp ${parseInt(item.nominal).toLocaleString('id-ID')}` : '-'
        ]);
    });

    doc.autoTable({
        startY: 30,
        head: [['Tanggal', 'Keterangan', 'Pemasukan', 'Pengeluaran']],
        body: rows,
        headStyles: { fillColor: [6, 78, 59] },
        theme: 'grid'
    });

    doc.save(`Kas_RT04_Warga_${tglMulaiIndo}.pdf`);
}

async function jalankanPopupMaklumat() {
    const res = await fetch(`${DB_URL}/informasi_popup.json`);
    const data = await res.json();
    if(data && data.judul) {
        document.getElementById('popupWargaJudul').innerText = data.judul;
        document.getElementById('popupWargaIsi').innerText = data.isi;
        openModal('mInfoWargaPopup');
    }
}

// Fungsi Berubah: Mengganti confirm() bawaan menjadi Custom Notification Smooth
function logoutWarga() {
    localStorage.clear();
    KEY_WARGA_LOGGED_IN = null;
    AKUN_WARGA_LOGGED_IN = null;
    
    showNotif('Berhasil keluar dari aplikasi', 'sukses');
    
    setTimeout(() => {
        document.getElementById('scr-login').style.display = 'flex';
    }, 600);
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// Fungsi Berubah: Menambahkan penanganan timeout (window.notifTimeout) agar tidak crash jika dipicu berkali-kali
function showNotif(msg, type) {
    const box = document.getElementById('notificationAlert'); 
    const icon = document.getElementById('notifIcon'); 
    const text = document.getElementById('notifText'); 
    
    if(!box || !icon || !text) return;
    text.innerText = msg;
    
    box.className = `fixed top-4 left-1/2 -translate-x-1/2 w-11/12 max-w-sm z-[99999] p-4 rounded-2xl shadow-lg border text-xs font-black uppercase tracking-wide flex items-center gap-2.5 transition-all duration-300 ${type==='sukses'?'bg-emerald-50 border-emerald-200 text-emerald-800':'bg-rose-50 border-rose-200 text-rose-800'}`;
    icon.className = `fa-solid ${type==='sukses'?'fa-circle-check text-emerald-600':'fa-circle-xmark text-rose-600'} text-base`;
    
    box.classList.remove('hidden'); 
    
    if (window.notifTimeout) clearTimeout(window.notifTimeout);
    window.notifTimeout = setTimeout(() => box.classList.add('hidden'), 3000);
}

// Fungsi Tambahan Khusus: Menghubungkan fungsi salin di file HTML (index) langsung ke Custom Notification Alert kita
function salinNorekKeClipboard() {
    const text = document.getElementById('norekSaku').innerText;
    navigator.clipboard.writeText(text).then(() => {
        showNotif('Nomor Rekening Berhasil Disalin!', 'sukses');
    }).catch(() => {
        showNotif('Gagal menyalin nomor rekening', 'gagal');
    });
}
