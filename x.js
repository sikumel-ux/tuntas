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

function toggleLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
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
    toggleLoading(true);
    
    const hp = document.getElementById('loginHp').value.trim();
    const pass = document.getElementById('loginPass').value.trim();

    try {
        // Dikembalikan ke path database yang benar (warga_rt04)
        const res = await fetch(`${DB_URL}/warga_rt04.json`);
        const data = await res.json();
        
        let ketemu = false;
        if (data) {
            Object.keys(data).forEach(key => {
                // Dipastikan mencocokkan String, trim spasi, dan memakai key .username & .password sesuai db asli
                const dbUsername = String(data[key].username || '').trim();
                const dbPassword = String(data[key].password || '').trim();

                if (dbUsername === hp && dbPassword === pass) {
                    ketemu = true;
                    KEY_WARGA_LOGGED_IN = key;
                    AKUN_WARGA_LOGGED_IN = data[key];
                    
                    localStorage.setItem('warga_key', key);
                    localStorage.setItem('warga_data', JSON.stringify(data[key]));
                }
            });
        }

        if (ketemu) {
            showNotif('Selamat Datang Kembali!', 'sukses');
            cekSessionWarga();
        } else {
            showNotif('No WhatsApp atau Password Salah', 'gagal');
        }
    } catch (err) {
        showNotif('Gagal terhubung ke database', 'gagal');
    } finally {
        toggleLoading(false);
    }
}

async function sinkronUlangWarga() {
    if (!KEY_WARGA_LOGGED_IN) return;
    toggleLoading(true);
    await Promise.all([
        muatKasMasyarakat(), 
        muatIuranSaya(), 
        muatSampahSaya(), 
        muatBeritaWarga(), 
        jalankanPopupMaklumat()
    ]);
    toggleLoading(false);
}

function switchWargaTab(id) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(id).classList.add('active');
    
    const map = {
        'scr-w-kas': 'nav-btn-w-kas', 
        'scr-w-iuran': 'nav-btn-w-iuran', 
        'scr-w-sampah': 'nav-btn-w-sampah', 
        'scr-w-berita': 'nav-btn-w-berita', 
        'scr-w-profil': 'nav-btn-w-profil'
    };
    if (map[id]) document.getElementById(map[id]).classList.add('active');
}

async function muatKasMasyarakat() {
    try {
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
    } catch(e){}
}

function updateTampilanCardKasWarga(sk, sf, m, k) {
    document.getElementById('totalSaldoKeseluruhan').innerText = "Rp " + sk.toLocaleString('id-ID');
    document.getElementById('totalSaldo').innerText = "Rp " + sf.toLocaleString('id-ID');
    document.getElementById('textMasuk').innerText = "Rp " + m.toLocaleString('id-ID');
    document.getElementById('textKeluar').innerText = "Rp " + k.toLocaleString('id-ID');
}

async function muatIuranSaya() {
    try {
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
    } catch(e){}
}

async function muatSampahSaya() {
    try {
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
                                <h4 class="text-xs font-bold text-slate-700 uppercase">Jadwal Tanggal ${formatTanggalIndo(s.tanggal)}</h4>
                                <p class="text-[9px] font-mono text-slate-400 mt-0.5">Jam Log: ${s.jam_diambil || '-'}</p>
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
    } catch(e){}
}

async function muatBeritaWarga() {
    try {
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
    } catch(e){}
}

function prosesUnggahFotoWarga(e) {
    const file = e.target.files[0];
    if (!file) return;

    toggleLoading(true);
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

            fetch(`${DB_URL}/warga_rt04/${KEY_WARGA_LOGGED_IN}/foto.json`, {
                method: 'PUT',
                body: JSON.stringify(compressedBase64)
            }).then(() => {
                AKUN_WARGA_LOGGED_IN.foto = compressedBase64;
                localStorage.setItem('warga_data', JSON.stringify(AKUN_WARGA_LOGGED_IN));
                document.getElementById('imgProfilWarga').src = compressedBase64;
                showNotif('Foto Profil Berhasil Diperbarui!', 'sukses');
            }).catch(() => {
                showNotif('Gagal memperbarui foto profil', 'gagal');
            }).finally(() => {
                toggleLoading(false);
            });
        };
    };
}

function perbaruiPasswordWarga(e) {
    e.preventDefault();
    const newPass = document.getElementById('newPassWarga').value.trim();
    toggleLoading(true);

    fetch(`${DB_URL}/warga_rt04/${KEY_WARGA_LOGGED_IN}/password.json`, {
        method: 'PUT',
        body: JSON.stringify(newPass)
    }).then(() => {
        AKUN_WARGA_LOGGED_IN.password = newPass;
        localStorage.setItem('warga_data', JSON.stringify(AKUN_WARGA_LOGGED_IN));
        document.getElementById('formPassWarga').reset();
        showNotif('Password Berhasil Diperbarui!', 'sukses');
    }).catch(() => {
        showNotif('Gagal memperbarui password', 'gagal');
    }).finally(() => {
        toggleLoading(false);
    });
}

function bukaKonfirmasiWa() {
    if(!AKUN_WARGA_LOGGED_IN) return;
    const teks = encodeURIComponent(`Halo Pengurus TUNTAS RT 04, saya ${AKUN_WARGA_LOGGED_IN.nama} ingin konfirmasi bahwa saya telah melakukan transfer iuran sampah/kas. Mohon untuk dicek, terima kasih.`);
    window.open(`https://wa.me/6281234567890?text=${teks}`, '_blank'); 
}

function kirimSaranAspirasi(e) {
    e.preventDefault();
    const input = document.getElementById('isiSaranWarga');
    const body = {
        nama_warga: AKUN_WARGA_LOGGED_IN.nama,
        isi_saran: input.value.trim(),
        tanggal: new Date().toISOString().split('T')[0]
    };

    toggleLoading(true);
    fetch(`${DB_URL}/saran_warga.json`, { 
        method: 'POST', 
        body: JSON.stringify(body) 
    }).then(() => {
        input.value = "";
        showNotif('Aspirasi berhasil dikirim!', 'sukses');
    }).catch(() => {
        showNotif('Gagal mengirim aspirasi', 'gagal');
    }).finally(() => {
        toggleLoading(false);
    });
}

function unduhPdfKasWarga() {
    if (DATA_KAS_TERFILTER.length === 0) {
        showNotif('Tidak ada data kas untuk dicetak!', 'gagal');
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFont("Helvetica", "bold");
    doc.text("LAPORAN MUTASI KAS TUNTAS RT 04 DONGKELAN", 14, 15);
    doc.setFontSize(9);
    doc.setFont("Helvetica", "normal");
    doc.text(`Periode: ${document.getElementById('filterMulaiWarga').value} s/d ${document.getElementById('filterSelesaiWarga').value}`, 14, 21);
    doc.text(`Diunduh oleh Warga: ${AKUN_WARGA_LOGGED_IN.nama}`, 14, 25);

    const rows = [];
    const sortedData = [...DATA_KAS_TERFILTER].reverse();
    sortedData.forEach(item => {
        rows.push([
            formatTanggalIndo(item.tanggal),
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

    doc.save(`Kas_RT04_Warga_${document.getElementById('filterMulaiWarga').value}.pdf`);
    showNotif('Laporan PDF Berhasil Diunduh!', 'sukses');
}

async function jalankanPopupMaklumat() {
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
// SYSTEM CUSTOM NOTIFIKASI FLOATING (MODERN)
// ==========================================
let timerNotifWarga = null;

function showNotif(msg, type) {
    const box = document.getElementById('notificationAlert'); 
    const icon = document.getElementById('notifIcon'); 
    const text = document.getElementById('notifText'); 
    
    if(!box || !icon || !text) return;
    if(timerNotifWarga) clearTimeout(timerNotifWarga);
    
    text.innerText = msg;
    
    // Set style melayang modern dengan transisi halus
    if(type === 'sukses') {
        box.className = "fixed top-4 left-1/2 -translate-x-1/2 w-11/12 max-w-sm z-[99999] p-4 rounded-2xl shadow-xl border bg-emerald-50 border-emerald-200 text-emerald-900 font-extrabold uppercase tracking-wide flex items-center gap-2.5 transition-all duration-300 transform translate-y-0 opacity-100";
        icon.className = "fa-solid fa-circle-check text-emerald-600 text-base";
    } else {
        box.className = "fixed top-4 left-1/2 -translate-x-1/2 w-11/12 max-w-sm z-[99999] p-4 rounded-2xl shadow-xl border bg-rose-50 border-rose-200 text-rose-900 font-extrabold uppercase tracking-wide flex items-center gap-2.5 transition-all duration-300 transform translate-y-0 opacity-100";
        icon.className = "fa-solid fa-circle-xmark text-rose-600 text-base";
    }
    
    box.classList.remove('hidden'); 
    
    timerNotifWarga = setTimeout(() => {
        box.classList.add('opacity-0', '-translate-y-2');
        setTimeout(() => {
            box.classList.add('hidden');
            box.classList.remove('opacity-0', '-translate-y-2');
        }, 300);
    }, 3000);
}

function logoutWarga() {
    // Diganti transisi halus interaktif tanpa confirm bawaan browser kaku
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

function formatTanggalIndo(tglStr) {
    if(!tglStr) return '-';
    const d = new Date(tglStr);
    if(isNaN(d.getTime())) return tglStr; // fallback kalau format string custom
    const opt = { day: 'numeric', month: 'long', year: 'numeric' };
    return d.toLocaleDateString('id-ID', opt);
}
