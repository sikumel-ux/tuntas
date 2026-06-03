// ==========================================================================
// TUNTAS - Premium Minimalist Frontend Engine (Figma Style)
// ==========================================================================

// URL REST API Google Apps Script Integration Engine
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzt1GIvQ2tMRz0rnBEgIoqq75858xW_xsbOf1TCDwAoADVmfeV61vVOMPxCvDIz1JG8/exec";

const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
let dbGlobal = { kas: [], pembayaran: [], anggota: [], sampah: [] };
let onConfirmSuccess = null;

// --- UI Loading & Modal Control ---
function showLoading() { document.getElementById('loading').style.display = 'flex'; }
function hideLoading() { document.getElementById('loading').style.display = 'none'; }

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// --- Custom Alert & Confirm (Premium UI) ---
function tuntasAlert(title, message, type = 'success') {
    const icon = document.getElementById('alertIcon');
    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMsg').innerText = message;
    icon.className = "w-12 h-12 mx-auto rounded-full flex items-center justify-center " + (type === 'error' ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600");
    icon.innerHTML = '<span class="material-symbols-rounded">' + (type === 'error' ? 'gpp_maybe' : 'check_circle') + '</span>';
    openModal('customAlert');
}

function closeAlert() { closeModal('customAlert'); }

function tuntasConfirm(message, onYes) {
    document.getElementById('confirmMsg').innerText = message;
    onConfirmSuccess = onYes;
    openModal('customConfirm');
}

function closeConfirm() { closeModal('customConfirm'); onConfirmSuccess = null; }

document.getElementById('confirmBtnOk').onclick = function() {
    if (onConfirmSuccess) onConfirmSuccess();
    closeConfirm();
};

function formatRupiah(num) { return "Rp " + parseFloat(num || 0).toLocaleString('id-ID'); }

/**
 * Mengonversi tanggal ISO (YYYY-MM-DD) menjadi format Bulan Tahun
 * Contoh: 2026-05-12 -> Mei 2026
 */
function konversiBulanBergabung(tglStr) {
    if (!tglStr) return "-";
    const parts = tglStr.split("-");
    if (parts.length < 2) return tglStr;
    const indexBulan = parseInt(parts[1], 10) - 1;
    const namaBulan = daftarBulan[indexBulan] || "";
    const tahun = parts[0];
    return namaBulan + " " + tahun;
}

// --- Initialization App ---
function init() {
    const now = new Date();
    document.getElementById('fMulai').value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    document.getElementById('fSelesai').value = now.toISOString().split('T')[0];
    document.getElementById('iTgl').value = now.toISOString().split('T')[0];
    document.getElementById('kTgl').value = now.toISOString().split('T')[0];
    document.getElementById('sTgl').value = now.toISOString().split('T')[0];
    
    const grid = document.getElementById('gridBulan');
    const thr = document.getElementById('th-rekap');
    grid.innerHTML = ''; 
    thr.innerHTML = '<th class="sticky-col p-4 bg-white">Nama Warga</th>';
    
    daftarBulan.forEach(bln => {
        grid.innerHTML += '<label class="relative block"><input type="checkbox" name="blnCek" value="' + bln + '" class="hidden peer"><div class="cursor-pointer text-[9px] font-black py-3 text-center border rounded-xl bg-white text-slate-300 peer-checked:bg-emerald-900 peer-checked:text-white uppercase transition-all">' + bln.substring(0,3) + '</div></label>';
        thr.innerHTML += '<th class="text-center p-3 font-bold text-slate-400">' + bln.substring(0,3) + '</th>';
    });
    thr.innerHTML += '<th class="text-center p-3 font-bold text-slate-400">AKSI</th>';
    
    reloadData();
}

// --- Fetching Data (Gabungan 2 Spreadsheet) ---
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
            
            dbGlobal.kas = res.kas || [];
            dbGlobal.pembayaran = res.pembayaran || [];
            dbGlobal.anggota = res.anggota || [];
            dbGlobal.sampah = res.sampah || [];
            
            const iNama = document.getElementById('iNama');
            const sNama = document.getElementById('sNama');
            iNama.innerHTML = sNama.innerHTML = '<option value="">PILIH WARGA</option>';
            
            dbGlobal.anggota.forEach(w => {
                const opt = '<option value="' + w.Nama + '">' + w.Nama.toUpperCase() + '</option>';
                iNama.insertAdjacentHTML('beforeend', opt);
                sNama.insertAdjacentHTML('beforeend', opt);
            });
            
            renderDataTabel();
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

    // 1. Render KAS Umum
    dbGlobal.kas.forEach(trx => {
        const nil = parseFloat(trx.Nominal || 0);
        const isMsk = trx.Kategori && trx.Kategori.toLowerCase() === 'masuk';
        if(isMsk) s_selamanya += nil; else s_selamanya -= nil;

        const tTrx = new Date(trx.Tanggal);
        if(tTrx >= tMulai && tTrx <= tSelesai) {
            if(isMsk) f_masuk += nil; else f_keluar += nil;
            cont.innerHTML += '<div class="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-2xl animate-fade-in">' +
                '<div><p class="text-xs font-black uppercase text-slate-700">' + trx.Keterangan + '</p><p class="text-[9px] font-bold text-slate-400 mt-0.5">' + trx.Tanggal + '</p></div>' +
                '<div class="text-right flex items-center gap-2"><p class="text-xs font-black ' + (isMsk ? 'text-emerald-600' : 'text-red-500') + '">' + (isMsk ? '+' : '-') + ' ' + formatRupiah(nil) + '</p>' +
                '<button onclick="hapusTrx(\'kas\', \'' + trx.id + '\')" class="text-slate-300 hover:text-red-500"><span class="material-symbols-rounded !text-sm">delete</span></button></div>' +
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

    // 2. Render Data Warga (Modifikasi Bulan Bergabung & Hilangkan Tanda +)
    const cWarga = document.getElementById('tBodyWarga'); cWarga.innerHTML = "";
    dbGlobal.anggota.forEach(w => {
        const avatar = (w.Foto && w.Foto !== '-') ? w.Foto : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80';
        
        // Bersihkan tanda '+' jika ada di nomor HP/WA warga
        let nomorHpBersih = w.Hp || '-';
        if (nomorHpBersih.startsWith('+')) {
            nomorHpBersih = nomorHpBersih.substring(1);
        }

        // Format data tanggal menjadi text Bulan Bergabung (misal: Mei 2026)
        const teksBergabung = konversiBulanBergabung(w.Bergabung);

        cWarga.innerHTML += '<div class="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-2xl animate-fade-in">' +
            '<div class="flex items-center gap-3">' +
                '<img src="' + avatar + '" class="w-9 h-9 rounded-full object-cover border border-slate-100 bg-slate-100">' +
                '<div>' +
                    '<p class="text-xs font-black text-slate-800 uppercase">' + w.Nama + '</p>' +
                    '<p class="text-[9px] text-slate-400 font-bold mt-0.5"><i class="fa-brands fa-whatsapp"></i> ' + nomorHpBersih + ' • <span class="text-emerald-700 font-black">Bergabung: ' + teksBergabung + '</span></p>' +
                '</div>' +
            '</div>' +
            '<button onclick="hapusTrx(\'anggota\', \'' + w.id + '\')" class="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500"><span class="material-symbols-rounded !text-md">delete</span></button>' +
        '</div>';
    });
    
    if(dbGlobal.anggota.length === 0) {
        cWarga.innerHTML = '<p class="text-center text-[11px] text-slate-400 py-4 font-semibold">Belum ada data warga.</p>';
    }

    // 3. Render Matrix Rekap Iuran
    const tbRekap = document.getElementById('tb-rekap'); tbRekap.innerHTML = "";
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

// --- Handler Fetch Menggunakan Raw JSON Payload (Bypass Limit 5MB Google Apps Script) ---
function postJsonToSheets(dataObj, msg) {
    showLoading();
    fetch(SCRIPT_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(dataObj)
    })
    .then(res => res.json())
    .then(res => { 
        hideLoading(); 
        if(res.status === "error") {
            tuntasAlert("Gagal", res.message, "error");
        } else {
            tuntasAlert("Berhasil", msg); 
            reloadData(); 
        }
    })
    .catch((err) => { 
        hideLoading(); 
        console.error(err);
        tuntasAlert("Gagal", "Koneksi terputus dengan gerbang Google Sheets Backend", "error"); 
    });
}

// --- Submit Kas Umum (Sheet 1) ---
function simpanKas() {
    const tgl = document.getElementById('kTgl').value;
    const kat = document.getElementById('kKat').value;
    const ket = document.getElementById('kKet').value.trim();
    const nom = document.getElementById('kNom').value;
    
    if(!tgl || !ket || !nom) return tuntasAlert("Error Input", "Isi seluruh form input kas dengan lengkap!", "error");
    
    const payload = {
        action: 'insertKas',
        Tanggal: tgl,
        Kategori: kat,
        Keterangan: ket,
        Nominal: nom
    };
    
    closeModal('mKas'); 
    postJsonToSheets(payload, "Kas umum berhasil dicatat ke Spreadsheet KAS!");
}

// --- Submit Anggota + Upload Foto Ukuran Jumbo Tanpa Hambatan (Sheet 2 + Drive) ---
function simpanAnggota() {
    const name = document.getElementById('aNama').value.trim();
    const hp = document.getElementById('aHp').value.trim();
    const fileInput = document.getElementById('aFoto');
    
    if(!name || !hp) return tuntasAlert("Error Input", "Lengkapi data nama dan nomor WhatsApp terlebih dahulu!", "error");
    
    const payload = {
        action: 'insertAnggota',
        Nama: name,
        Hp: hp,
        Password: '12345',
        Bergabung: new Date().toISOString().split('T')[0], // Mengirim format tanggal ISO
        FotoData: '',
        FotoNama: '',
        FotoType: ''
    };

    if (fileInput && fileInput.files.length > 0) {
        showLoading();
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            payload.FotoData = e.target.result; 
            payload.FotoNama = file.name;
            payload.FotoType = file.type;
            
            closeModal('mAnggota');
            postJsonToSheets(payload, "Data warga & foto raksasa sukses disimpan ke database!");
        };
        reader.readAsDataURL(file);
    } else {
        closeModal('mAnggota'); 
        postJsonToSheets(payload, "Data warga berhasil didaftarkan tanpa lampiran foto!");
    }
}

// --- Submit Pembayaran Iuran Warga (Sheet 2) ---
function simpanIuran() {
    const nama = document.getElementById('iNama').value;
    const nominal = document.getElementById('iNom').value;
    const tgl = document.getElementById('iTgl').value;
    const bulan = Array.from(document.querySelectorAll('input[name="blnCek"]:checked')).map(c => c.value);
    
    if(!nama || !nominal || bulan.length === 0) return tuntasAlert("Error Input", "Lengkapi nama warga, nominal dana, dan pilihan bulan iuran!", "error");

    const noRef = "T-" + Math.floor(100000 + Math.random() * 900000);
    const payload = {
        action: 'insertPembayaran',
        Kode: noRef,
        Nama: nama,
        Tanggal: tgl,
        Keterangan: "Iuran Bulan: " + bulan.join(', '),
        Nominal: nominal
    };

    const target = dbGlobal.anggota.find(w => w.Nama && w.Nama.toLowerCase() === nama.toLowerCase());
    if(target && target.Hp) {
        let hpKirim = target.Hp.startsWith('+') ? target.Hp.substring(1) : target.Hp;
        const txt = "Halo, pak/bu *" + nama.toUpperCase() + "*..\nPembayaran Anda telah kami terima dengan no referensi *" + noRef + "*.\n\n---------------------------\nCek e-Kuitansi Anda di:\nhttps://sikumel-ux.github.io/Tuntas/kuitansi.html?id=" + noRef + "\n---------------------------\n\nTerimakasih atas partisipasinya.\n\nPengurus TUNTAS,\n\n*APRIYANTO*";
        window.open("https://wa.me/" + hpKirim + "?text=" + encodeURIComponent(txt), '_blank');
    }
    
    postJsonToSheets(payload, "Iuran tercatat! No Referensi: " + noRef);
    document.querySelectorAll('input[name="blnCek"]').forEach(c => c.checked = false);
    document.getElementById('iNom').value = "";
}

// --- Submit Log Operasional Sampah (Sheet 2) ---
function simpanLaporanSampah() {
    const tgl = document.getElementById('sTgl').value;
    const nama = document.getElementById('sNama').value;
    const statusRadio = document.querySelector('input[name="sStatus"]:checked');
    
    if(!tgl || !nama) return tuntasAlert("Error Input", "Lengkapi tanggal operasional dan pilihan nama warga!", "error");
    const status = statusRadio ? statusRadio.value : "Diambil";

    const payload = {
        action: 'insertSampah',
        Tanggal: tgl,
        Nama: nama,
        Status: status
    };
    
    postJsonToSheets(payload, "Laporan Operasional Sampah berhasil dicatat!");
}

// --- Hapus Data Terintegrasi ---
function hapusTrx(kelompok, id) {
    tuntasConfirm("Hapus data ini secara permanen dari database?", function() {
        const payload = {
            action: 'deleteData',
            type: kelompok,
            id: id
        };
        postJsonToSheets(payload, "Data berhasil dihapus dari server.");
    });
}

// --- Modal Riwayat Sub-Menu Iuran ---
function bukaDetailIuranWarga(namaWarga) {
    document.getElementById('mdTitle').innerText = "Riwayat: " + namaWarga.toUpperCase();
    const list = document.getElementById('mdList'); list.innerHTML = "";
    const riwayat = dbGlobal.pembayaran.filter(p => p.Nama && p.Nama.toLowerCase() === namaWarga.toLowerCase());
    
    if(riwayat.length > 0) {
        riwayat.forEach(r => {
            list.innerHTML += '<div class="p-2.5 bg-slate-50 rounded-xl flex justify-between items-center text-[11px] animate-fade-in">' +
                '<div><p class="font-black text-emerald-900">' + r.Keterangan + '</p><p class="text-[9px] text-slate-400 font-bold">' + r.Tanggal + '</p></div>' +
                '<div class="flex items-center gap-2"><span class="font-extrabold text-slate-700">' + formatRupiah(r.Nominal) + '</span>' +
                '<button onclick="closeModal(\'mDetailIuran\'); hapusTrx(\'pembayaran\', \'' + r.id + '\')" class="text-slate-300 hover:text-red-500"><span class="material-symbols-rounded !text-sm">delete</span></button></div>' +
            '</div>';
        });
    } else { 
        list.innerHTML = "<p class='text-center text-slate-400 py-4 font-semibold'>Belum ada riwayat pembayaran.</p>"; 
    }
    openModal('mDetailIuran');
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
    tuntasAlert("Cetak Dokumen", "Fitur cetak PDF siap dihubungkan dengan data transaksi Anda.", "success");
}

function logout() { 
    tuntasConfirm("Keluar dari area sistem administrator TUNTAS?", function() { 
        window.location.href = "index.html"; 
    }); 
}

window.onload = init;
