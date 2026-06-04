// ==========================================================================
// TUNTAS - Premium Minimalist Frontend Engine (User/Warga Portal Version)
// ==========================================================================

// URL REST API Google Apps Script Integration Engine (Sama dengan versi Admin)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw2O7sydQVyXZZhrsqAMhTABZkFYkL2x5L2x2exlc71Y6Qm-NPiUXYsSKzTsLVR_IJIRQ/exec";

const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
let dbGlobal = { kas: [], pembayaran: [], anggota: [], sampah: [] };

// --- UI Loading & Modal Control ---
function showLoading() { document.getElementById('loading').style.display = 'flex'; }
function hideLoading() { document.getElementById('loading').style.display = 'none'; }

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// --- Custom Alert (Premium UI) ---
function tuntasAlert(title, message, type = 'success') {
    const icon = document.getElementById('alertIcon');
    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMsg').innerText = message;
    icon.className = "w-12 h-12 mx-auto rounded-full flex items-center justify-center " + (type === 'error' ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600");
    icon.innerHTML = '<span class="material-symbols-rounded">' + (type === 'error' ? 'gpp_maybe' : 'check_circle') + '</span>';
    openModal('customAlert');
}

function closeAlert() { closeModal('customAlert'); }

function formatRupiah(num) { return "Rp " + parseFloat(num || 0).toLocaleString('id-ID'); }

// --- Initialization App ---
function init() {
    const now = new Date();
    document.getElementById('fMulai').value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    document.getElementById('fSelesai').value = now.toISOString().split('T')[0];
    
    const thr = document.getElementById('th-rekap');
    thr.innerHTML = '<th class="sticky-col p-4 bg-white">Nama Warga</th>';
    
    daftarBulan.forEach(bln => {
        thr.innerHTML += '<th class="text-center p-3 font-bold text-slate-400">' + bln.substring(0,3) + '</th>';
    });
    thr.innerHTML += '<th class="text-center p-3 font-bold text-slate-400">RIWAYAT</th>';
    
    reloadData();
}

// --- Fetching Data (View-Only dari Google Apps Script) ---
function reloadData() {
    showLoading();
    
    fetch(SCRIPT_URL + "?action=readAllData")
        .then(function(res) { return res.json(); })
        .then(function(res) {
            hideLoading();
            if (res.status === "error") {
                tuntasAlert("Gagal Server", res.message, "error");
                return;
            }
            
            // Mapping data murni dari properti return GAS
            dbGlobal.kas = res.kas || [];
            dbGlobal.pembayaran = res.pembayaran || [];
            dbGlobal.anggota = res.anggota || [];
            dbGlobal.sampah = res.sampah || [];
            
            // Render ulang seluruh UI komponen utama
            renderDataTabel();
            renderLaporanSampahUser();
        })
        .catch(function(err) { 
            hideLoading(); 
            console.error("Detail Error:", err);
            tuntasAlert("Error", "Gagal menyambung ke server Web Apps.", "error"); 
        });
}

// --- Render UI Tabel & Dashboard Matrix ---
function renderDataTabel() {
    const tMulai = new Date(document.getElementById('fMulai').value);
    const tSelesai = new Date(document.getElementById('fSelesai').value);
    tSelesai.setHours(23,59,59,999);

    let s_selamanya = 0, f_masuk = 0, f_keluar = 0;
    const cont = document.getElementById('listRiwayat');
    cont.innerHTML = "";

    // 1. Render data KAS (Bersih tanpa tombol hapus)
    dbGlobal.kas.forEach(trx => {
        const nil = parseFloat(trx.Nominal || 0);
        const isMsk = trx.Kategori && trx.Kategori.toLowerCase() === 'masuk';
        if(isMsk) s_selamanya += nil; else s_selamanya -= nil;

        const tTrx = new Date(trx.Tanggal);
        if(tTrx >= tMulai && tTrx <= tSelesai) {
            if(isMsk) f_masuk += nil; else f_keluar += nil;
            cont.innerHTML += '<div class="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-2xl animate-fade-in">' +
                '<div><p class="text-xs font-black uppercase text-slate-700">' + trx.Keterangan + '</p><p class="text-[9px] font-bold text-slate-400 mt-0.5">' + trx.Tanggal + '</p></div>' +
                '<div class="text-right"><p class="text-xs font-black ' + (isMsk ? 'text-emerald-600' : 'text-red-500') + '">' + (isMsk ? '+' : '-') + ' ' + formatRupiah(nil) + '</p></div>' +
            '</div>';
        }
    });

    if(cont.innerHTML === "") {
        cont.innerHTML = '<p class="text-center text-[11px] text-slate-400 py-4 font-semibold">Belum ada data transaksi.</p>';
    }

    document.getElementById('saldoSelamanya').innerText = formatRupiah(s_selamanya);
    document.getElementById('totalSaldo').innerText = formatRupiah(f_masuk - f_keluar);
    document.getElementById('totalMasuk').innerText = formatRupiah(f_masuk);
    document.getElementById('totalKeluar').innerText = formatRupiah(f_keluar);

    // 2. Render Matrix Rekap IURAN (Sesuai dengan HTML User)
    const tbRekap = document.getElementById('tb-rekap'); 
    tbRekap.innerHTML = "";
    dbGlobal.anggota.forEach(w => {
        let tr = '<tr><td class="sticky-col p-3 border-b text-slate-700 uppercase font-black bg-white">' + w.Nama + '</td>';
        daftarBulan.forEach(bln => {
            const lunas = dbGlobal.pembayaran.some(p => p.Nama && w.Nama && p.Nama.toLowerCase() === w.Nama.toLowerCase() && p.Keterangan && p.Keterangan.includes(bln));
            tr += '<td class="text-center border-b p-2"><span class="inline-block w-5 h-5 rounded-md ' + (lunas ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-300') + ' font-black text-[10px] flex items-center justify-center mx-auto">' + (lunas ? '✓' : '—') + '</span></td>';
        });
        tr += '<td class="text-center border-b p-2"><button onclick="bukaDetailIuranWarga(\'' + w.Nama + '\')" class="text-emerald-700 font-black text-[10px] hover:underline">LIHAT</button></td></tr>';
        tbRekap.insertAdjacentHTML('beforeend', tr);
    });

    if(dbGlobal.anggota.length === 0) {
        tbRekap.innerHTML = '<tr><td colspan="14" class="text-center p-4 text-slate-400 font-semibold">Data matriks iuran masih kosong.</td></tr>';
    }
}

// --- Modal Riwayat Sub-Menu Iuran (Bersih tanpa tombol hapus) ---
function bukaDetailIuranWarga(namaWarga) {
    document.getElementById('mdTitle').innerText = "Riwayat: " + namaWarga.toUpperCase();
    const list = document.getElementById('mdList'); 
    list.innerHTML = "";
    const riwayat = dbGlobal.pembayaran.filter(p => p.Nama && p.Nama.toLowerCase() === namaWarga.toLowerCase());
    
    if(riwayat.length > 0) {
        riwayat.forEach(r => {
            list.innerHTML += '<div class="p-2.5 bg-slate-50 rounded-xl flex justify-between items-center text-[11px] animate-fade-in">' +
                '<div><p class="font-black text-emerald-900">' + r.Keterangan + '</p><p class="text-[9px] text-slate-400 font-bold">' + r.Tanggal + '</p></div>' +
                '<div><span class="font-extrabold text-slate-700">' + formatRupiah(r.Nominal) + '</span></div>' +
            '</div>';
        });
    } else { 
        list.innerHTML = "<p class='text-center text-slate-400 py-4 font-semibold'>Belum ada riwayat pembayaran.</p>"; 
    }
    openModal('mDetailIuran');
}

// --- Render Log Info Sampah (Real-Time dengan Filter Pencarian Warga) ---
function renderLaporanSampahUser() {
    const listSampahUser = document.getElementById('listSampahUser');
    if(!listSampahUser) return; // Mengantisipasi jika elemen belum termuat

    const keyword = document.getElementById('sCariWarga').value.trim().toUpperCase();
    listSampahUser.innerHTML = '';

    // Filter data sampah berdasarkan input ketikan warga
    let dataTerfilter = dbGlobal.sampah;
    if(keyword) {
        dataTerfilter = dbGlobal.sampah.filter(s => s.Nama && s.Nama.toUpperCase().includes(keyword));
    }

    // Sorting log operasional berdasarkan tanggal terbaru
    dataTerfilter.sort((a, b) => new Date(b.Tanggal) - new Date(a.Tanggal));

    if(dataTerfilter.length === 0) {
        listSampahUser.innerHTML = '<p class="text-center text-[11px] text-slate-400 py-4 font-semibold">Tidak ditemukan data log sampah.</p>';
        return;
    }

    dataTerfilter.forEach(item => {
        let warnaStatus = 'bg-slate-100 text-slate-600';
        let ikon = 'check_circle';

        const statusLower = item.Status ? item.Status.toLowerCase() : '';
        if(statusLower === 'diambil') {
            warnaStatus = 'bg-emerald-50 text-emerald-700 border-emerald-100';
            ikon = 'delete_slipped';
        } else if(statusLower === 'tidak diambil' || statusLower === 'lewat') {
            warnaStatus = 'bg-rose-50 text-rose-700 border-rose-100';
            ikon = 'dangerous';
        } else if(statusLower === 'kosong') {
            warnaStatus = 'bg-amber-50 text-amber-700 border-amber-100';
            ikon = 'remove_circle';
        }

        listSampahUser.innerHTML += '<div class="p-4 bg-white border border-slate-100 rounded-3xl shadow-sm flex justify-between items-center animate-fade-in">' +
            '<div class="space-y-0.5">' +
                '<h4 class="font-black text-xs text-slate-800 uppercase">' + item.Nama + '</h4>' +
                '<p class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter"><i class="fa-regular fa-calendar mt-0.5 mr-1"></i>' + item.Tanggal + '</p>' +
            '</div>' +
            '<div class="px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase flex items-center gap-1 ' + warnaStatus + '">' +
                '<span class="material-symbols-rounded !text-xs">' + ikon + '</span> ' + item.Status + '
            </div>' +
        '</div>';
    });
}

// --- SPA Tab Content Navigation Route ---
function st(t) {
    document.querySelectorAll('.tab-content').forEach(function(screen) {
        screen.style.display = 'none'; 
        screen.classList.remove('active');
    });
    
    const targetScreen = document.getElementById('screen-' + t);
    if (targetScreen) {
        targetScreen.style.display = 'block'; 
        targetScreen.classList.add('active');
    }
    
    document.querySelectorAll('nav button').forEach(function(btn) {
        btn.classList.remove('active');
    });
    
    const targetBtn = document.getElementById('n-' + t);
    if (targetBtn) {
        targetBtn.classList.add('active');
    }
}

function downloadPDF() {
    tuntasAlert("Cetak Dokumen", "Fitur cetak PDF siap dihubungkan dengan data transaksi Anda.");
}

window.onload = init;
