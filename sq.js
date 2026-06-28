// 1. SUPABASE CREDENTIAL CONNECTIONS
const SUPABASE_URL = "https://dgxdrgphsybpbonsfmve.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ng4doS4MiUqzH6O-7U2lyg_IwW1QbIT";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let AKUN_WARGA_LOGGED_IN = null;
let KEY_WARGA_LOGGED_IN = null; 
let DATA_KAS_TERFILTER = [];    

// Jalankan inisialisasi tanpa nunggu event lambat di HP
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', nyalakanEngineAplikasi);
} else {
    nyalakanEngineAplikasi();
}

function nyalakanEngineAplikasi() {
    initEventListeners();
    cekSessionWarga();
}

function initEventListeners() {
    // Ikat event listener dengan aman
    const ikat = (id, event, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, fn);
    };

    ikat('formSaranWarga', 'submit', kirimSaranAspirasi);
    ikat('formPassWarga', 'submit', perbaruiPasswordWarga);
    ikat('btnRefresh', 'click', sinkronUlangWarga);
    ikat('btnLogout', 'click', logoutWarga);
    ikat('btnCetakPdf', 'click', unduhPdfKasWarga);
    ikat('btnKonfirmasiWa', 'click', bukaKonfirmasiWa);
    ikat('filterMulaiWarga', 'change', muatKasMasyarakat);
    ikat('filterSelesaiWarga', 'change', muatKasMasyarakat);
    ikat('inputFotoWarga', 'change', prosesUnggahFotoWarga);

    document.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.getAttribute('data-target')));
    });

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchWargaTab(btn.getAttribute('data-target')));
    });
}

function formatTanggalIndo(tglStr) {
    if (!tglStr) return "-";
    const parts = tglStr.split('-');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return tglStr;
}

// 2. MANAGEMENT SESSION
function cekSessionWarga() {
    const savedKey = localStorage.getItem('warga_key');
    const savedData = localStorage.getItem('warga_data');
    
    if (savedKey && savedData) {
        KEY_WARGA_LOGGED_IN = savedKey;
        AKUN_WARGA_LOGGED_IN = JSON.parse(savedData);
        
        document.getElementById('scr-login').style.display = 'none';
        document.getElementById('labelNamaWarga').innerText = AKUN_WARGA_LOGGED_IN.nama;
        document.getElementById('labelBulanBergabung').innerText = AKUN_WARGA_LOGGED_IN.bulan_bergabung || 'Juni 2026';
        document.getElementById('namaWargaProfil').innerText = AKUN_WARGA_LOGGED_IN.nama;
        document.getElementById('hpWargaProfil').innerText = "WA: " + AKUN_WARGA_LOGGED_IN.username;
        
        const validFoto = (AKUN_WARGA_LOGGED_IN.foto && AKUN_WARGA_LOGGED_IN.foto !== 'default.png') ? AKUN_WARGA_LOGGED_IN.foto : 'default.png';
        document.getElementById('imgProfilWarga').src = validFoto;
        document.getElementById('imgProfilWargaBesar').src = validFoto;

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

// JALUR TOL PENAHAN REFRESH HALAMAN UTAMA
async function prosesLoginWargaDirect(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    document.getElementById('loadingOverlay').style.display = 'flex';
    
    const hp = document.getElementById('loginHp').value.trim();
    const pass = document.getElementById('loginPass').value.trim();

    try {
        const { data, error } = await supabase
            .from('warga_rt04')
            .select('*')
            .eq('username', hp)
            .eq('password', pass)
            .maybeSingle();

        if (error) {
            showNotif('Gagal terhubung database Supabase', 'gagal');
            return;
        }

        if (!data) {
            showNotif('No WhatsApp/password salah', 'gagal');
        } else {
            KEY_WARGA_LOGGED_IN = data.id;
            AKUN_WARGA_LOGGED_IN = data;
            
            localStorage.setItem('warga_key', data.id);
            localStorage.setItem('warga_data', JSON.stringify(data));
            
            showNotif('Login Berhasil!', 'sukses');
            cekSessionWarga();
        }
    } catch (err) {
        showNotif('Koneksi internet terputus', 'gagal');
    } finally {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}
window.prosesLoginWargaDirect = prosesLoginWargaDirect;

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
    
    if(document.getElementById(id)) document.getElementById(id).classList.add('active');
    
    const map = {
        'scr-w-kas': 'nav-btn-w-kas', 'scr-w-iuran': 'nav-btn-w-iuran', 
        'scr-w-sampah': 'nav-btn-w-sampah', 'scr-w-berita': 'nav-btn-w-berita', 'scr-w-profil': 'nav-btn-w-profil'
    };
    if (map[id] && document.getElementById(map[id])) document.getElementById(map[id]).classList.add('active');
}

// 3. FETCH KAS RT FROM SUPABASE
async function muatKasMasyarakat() {
    const list = document.getElementById('listWargaKas');
    if (!list) return;
    list.innerHTML = "";
    DATA_KAS_TERFILTER = [];

    const start = document.getElementById('filterMulaiWarga').value;
    const end = document.getElementById('filterSelesaiWarga').value;

    try {
        const { data: semuaKas } = await supabase.from('kas_rt04').select('*');
        let saldoKeseluruhan = 0;
        
        if (semuaKas) {
            semuaKas.forEach(v => {
                const nom = parseInt(v.nominal) || 0;
                if(v.jenis === 'masuk') { saldoKeseluruhan += nom; } else { saldoKeseluruhan -= nom; }
            });
        }

        if(!start || !end) return;

        const { data: kasTerfilter } = await supabase
            .from('kas_rt04')
            .select('*')
            .gte('tanggal', start)
            .lte('tanggal', end)
            .order('tanggal', { ascending: false });

        let sldTerapit = 0, mskTerapit = 0, klrTerapit = 0;

        if (!kasTerfilter || kasTerfilter.length === 0) {
            list.innerHTML = `<div class="p-4 text-center text-xs text-slate-400 font-bold uppercase">Belum ada catatan kas.</div>`;
            updateTampilanCardKasWarga(saldoKeseluruhan, 0, 0, 0);
            return;
        }

        DATA_KAS_TERFILTER = kasTerfilter;

        kasTerfilter.forEach(v => {
            const nom = parseInt(v.nominal) || 0;
            if(v.jenis === 'masuk') { mskTerapit += nom; } else { klrTerapit += nom; }
            
            list.insertAdjacentHTML('beforeend', `
                <div class="p-4 flex justify-between items-center bg-white">
                    <div>
                        <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wide">${v.keterangan}</h4>
                        <p class="text-[9px] font-mono text-slate-400 mt-0.5">${formatTanggalIndo(v.tanggal)}</p>
                    </div>
                    <span class="text-xs font-black ${v.jenis === 'masuk' ? 'text-emerald-600' : 'text-rose-600'}">
                        ${v.jenis === 'masuk' ? '+' : '-'} ${nom.toLocaleString('id-ID')}
                    </span>
                </div>
            `);
        });

        sldTerapit = mskTerapit - klrTerapit;
        updateTampilanCardKasWarga(saldoKeseluruhan, sldTerapit, mskTerapit, klrTerapit);
    } catch (e) { console.error(e); }
}

function updateTampilanCardKasWarga(sk, sf, m, k) {
    document.getElementById('totalSaldoKeseluruhan').innerText = sk.toLocaleString('id-ID');
    document.getElementById('totalSaldo').innerText = sf.toLocaleString('id-ID');
    document.getElementById('textMasuk').innerText = m.toLocaleString('id-ID');
    document.getElementById('textKeluar').innerText = k.toLocaleString('id-ID');
}

// 4. FETCH IURAN
async function muatIuranSaya() {
    const list = document.getElementById('listIuranSaya');
    if (!list) return;
    list.innerHTML = "";

    const { data } = await supabase
        .from('iuran_sampah')
        .select('*')
        .eq('warga_key', KEY_WARGA_LOGGED_IN)
        .order('tanggal', { ascending: false });

    if (!data || data.length === 0) {
        list.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 font-bold uppercase">Kamu belum memiliki riwayat iuran.</div>`;
        return;
    }

    data.forEach(i => {
        const linkKuitansi = `https://app.sekawan.my.id/kuitansi/?id=${i.token_kuitansi}`;
        list.insertAdjacentHTML('beforeend', `
            <div class="p-4 flex justify-between items-center bg-white">
                <div>
                    <h4 class="text-xs font-black text-slate-700 uppercase">IURAN BULAN ${i.bulan}</h4>
                    <p class="text-[9px] text-slate-400 font-bold mt-0.5">Tgl Bayar: ${formatTanggalIndo(i.tanggal)}</p>
                </div>
                <div class="flex flex-col items-end gap-1">
                    <span class="text-xs font-black text-emerald-600">Rp ${parseInt(i.nominal).toLocaleString('id-ID')}</span>
                    <a href="${linkKuitansi}" target="_blank" class="text-[9px] bg-slate-100 text-slate-700 font-black px-2 py-1 rounded border border-slate-200 uppercase"><i class="fa-solid fa-file-invoice"></i> Kuitansi</a>
                </div>
            </div>
        `);
    });
}

// 5. RENDER LOG SAMPAH JUNI 2026
async function muatSampahSaya() {
    const boxKalender = document.getElementById('boxKalenderSampahWarga');
    if (!boxKalender) return;
    boxKalender.innerHTML = "";
    const mapSampahJuni = {};

    const { data } = await supabase
        .from('laporan_sampah')
        .select('*')
        .eq('warga_key', KEY_WARGA_LOGGED_IN)
        .like('tanggal', '2026-06-%');

    if (data) {
        data.forEach(s => {
            const partTgl = s.tanggal.split('-');
            const tanggalAngka = parseInt(partTgl[2]);
            mapSampahJuni[tanggalAngka] = { jam: s.jam_diambil || "Malam Hari", status: s.status || "diambil" };
        });
    }

    for (let i = 1; i <= 30; i++) {
        let classWarna = "bg-slate-100 text-slate-700 font-bold";
        if (mapSampahJuni[i]) {
            const stat = mapSampahJuni[i].status.toLowerCase();
            if (stat === 'diambil' || stat === 'diantar') classWarna = "bg-emerald-600 text-white font-extrabold";
            else if (stat === 'kosong') classWarna = "bg-rose-100 text-rose-800 border border-rose-200 font-extrabold";
        }
        const jamLog = mapSampahJuni[i] ? mapSampahJuni[i].jam : "-";
        const statusLog = mapSampahJuni[i] ? mapSampahJuni[i].status : "Belum Ada Log";

        boxKalender.insertAdjacentHTML('beforeend', `
            <div class="day-box ${classWarna}" onclick="bukaDetailSampahKalender('${i}', '${jamLog}', '${statusLog}')">${i}</div>
        `);
    }
}

function bukaDetailSampahKalender(tanggal, jam, status) {
    document.getElementById('dtlSampahTgl').innerText = `${String(tanggal).padStart(2, '0')}-06-2026`;
    document.getElementById('dtlSampahJam').innerText = jam;
    
    const statusEl = document.getElementById('dtlSampahStatus');
    statusEl.innerText = status;
    statusEl.className = "font-black px-2 py-0.5 rounded uppercase text-[10px]";
    if(status === 'diambil' || status === 'diantar') statusEl.classList.add('bg-emerald-100', 'text-emerald-800');
    else if(status === 'kosong') statusEl.classList.add('bg-rose-100', 'text-rose-800');
    else statusEl.classList.add('bg-slate-100', 'text-slate-600');

    openModal('mDetailSampahWarga');
}

// 6. ANNOUNCEMENT & KOTAK SARAN
async function muatBeritaWarga() {
    const list = document.getElementById('listBeritaWarga');
    if (!list) return;
    list.innerHTML = ""; 
    
    const { data } = await supabase.from('pengumuman').select('*').order('tanggal', { ascending: false });
    if(!data || data.length === 0) {
        list.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 font-bold uppercase bg-white rounded-2xl border border-slate-100">Belum ada berita terbaru.</div>`;
        return;
    }
    data.forEach(item => {
        list.insertAdjacentHTML('beforeend', `
            <div class="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-1">
                <div class="flex justify-between items-center">
                    <h4 class="text-xs font-black text-slate-800 uppercase">${item.judul}</h4>
                    <span class="text-[8px] font-mono text-slate-400">${formatTanggalIndo(item.tanggal)}</span>
                </div>
                <p class="text-xs text-slate-600 font-semibold">${item.isi}</p>
            </div>
        `);
    });
}

async function kirimSaranAspirasi(e) {
    e.preventDefault();
    const input = document.getElementById('isiSaranWarga');
    const { error } = await supabase.from('saran_warga').insert([{ nama_warga: AKUN_WARGA_LOGGED_IN.nama, isi_saran: input.value.trim(), tanggal: new Date().toISOString().split('T')[0] }]);
    if (!error) {
        input.value = "";
        showNotif('Aspirasi berhasil dikirim!', 'sukses');
    }
}

async function perbaruiPasswordWarga(e) {
    e.preventDefault();
    const newPass = document.getElementById('newPassWarga').value.trim();
    const { error } = await supabase.from('warga_rt04').update({ password: newPass }).eq('id', KEY_WARGA_LOGGED_IN);
    if (!error) {
        AKUN_WARGA_LOGGED_IN.password = newPass;
        localStorage.setItem('warga_data', JSON.stringify(AKUN_WARGA_LOGGED_IN));
        document.getElementById('formPassWarga').reset();
        showNotif('Password Diperbarui!', 'sukses');
    }
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
            canvas.width = 400; canvas.height = img.height * (400 / img.width);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

            supabase.from('warga_rt04').update({ foto: compressedBase64 }).eq('id', KEY_WARGA_LOGGED_IN).then(({ error }) => {
                if (!error) {
                    AKUN_WARGA_LOGGED_IN.foto = compressedBase64;
                    localStorage.setItem('warga_data', JSON.stringify(AKUN_WARGA_LOGGED_IN));
                    document.getElementById('imgProfilWarga').src = compressedBase64;
                    document.getElementById('imgProfilWargaBesar').src = compressedBase64;
                    showNotif('Foto Profil Diperbarui!', 'sukses');
                }
            }).finally(() => document.getElementById('loadingOverlay').style.display = 'none');
        };
    };
}

function bukaKonfirmasiWa() {
    const teks = encodeURIComponent(`Halo Pengurus TUNTAS RT 04, saya ${AKUN_WARGA_LOGGED_IN.nama} ingin konfirmasi pembayaran iuran.`);
    window.open(`https://wa.me/6285163233482?text=${teks}`, '_blank'); 
}

function unduhPdfKasWarga() {
    if (DATA_KAS_TERFILTER.length === 0) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("LAPORAN MUTASI KAS TUNTAS RT 04", 14, 15);
    const rows = [];
    DATA_KAS_TERFILTER.forEach(item => {
        rows.push([formatTanggalIndo(item.tanggal), item.keterangan.toUpperCase(), item.jenis === 'masuk' ? `Rp ${parseInt(item.nominal).toLocaleString('id-ID')}` : '-', item.jenis === 'keluar' ? `Rp ${parseInt(item.nominal).toLocaleString('id-ID')}` : '-']);
    });
    doc.autoTable({ startY: 25, head: [['Tanggal', 'Keterangan', 'Pemasukan', 'Pengeluaran']], body: rows, headStyles: { fillColor: [6, 78, 59] } });
    doc.save("Kas_RT04.pdf");
}

async function jalankanPopupMaklumat() {
    const { data } = await supabase.from('informasi_popup').select('*').limit(1).maybeSingle();
    if(data && data.judul) {
        document.getElementById('popupWargaJudul').innerText = data.judul;
        document.getElementById('popupWargaIsi').innerText = data.isi;
        openModal('mInfoWargaPopup');
    }
}

function logoutWarga() {
    localStorage.clear();
    showNotif('Berhasil keluar', 'sukses');
    setTimeout(() => document.getElementById('scr-login').style.display = 'flex', 600);
}

function openModal(id) { if(document.getElementById(id)) document.getElementById(id).classList.add('active'); }
function closeModal(id) { if(document.getElementById(id)) document.getElementById(id).classList.remove('active'); }

function showNotif(msg, type) {
    const box = document.getElementById('notificationAlert'); 
    const icon = document.getElementById('notifIcon'); 
    const text = document.getElementById('notifText'); 
    if(!box) return;
    text.innerText = msg;
    box.className = `fixed top-4 left-1/2 -translate-x-1/2 w-11/12 max-w-sm z-[9999999] p-4 rounded-2xl border text-xs font-black uppercase tracking-wide flex items-center gap-2.5 transition-all duration-300 ${type === 'sukses' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`;
    icon.className = `fa-solid ${type === 'sukses' ? 'fa-circle-check text-emerald-600' : 'fa-circle-xmark text-rose-600'}`;
    box.classList.remove('hidden'); 
    setTimeout(() => box.classList.add('hidden'), 3000);
}
