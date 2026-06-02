// URL REST API Google Apps Script Integration Engine (Pure Google Sheets 2 ID)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxWBiydnhQ5fyhJp-4O4RvfDZyMzykqQWfF-DMQ3WqoEILQ1YO8e-8Fgw7cfjBbkmWt/exec";

const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
// dbGlobal disesuaikan murni dengan struktur nama tab/properti baru dari Sheet kamu
let dbGlobal = { kas: [], pembayaran: [], anggota: [], sampah: [] };
let onConfirmSuccess = null;

function showLoading() { document.getElementById('loading').style.display = 'flex'; }
function hideLoading() { document.getElementById('loading').style.display = 'none'; }

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

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

// Mengambil gabungan data dari kedua Spreadsheet melalui Apps Script
function reloadData() {
    showLoading();
    
    const urlObj = new URL(SCRIPT_URL);
    urlObj.searchParams.append("action", "readAllData");
    
    fetch(urlObj.toString())
        .then(function(res) { return res.json(); })
        .then(function(res) {
            hideLoading();
            if (res.status === "error") {
                tuntasAlert("Gagal Server", res.message, "error");
                return;
            }
            // Mapping data disesuaikan dengan penamaan properti murni dari Sheet barumu
            dbGlobal.kas = res.kas || [];
            dbGlobal.pembayaran = res.pembayaran || [];
            dbGlobal.anggota = res.anggota || [];
            dbGlobal.sampah = res.sampah || [];
            
            const iNama = document.getElementById('iNama');
            const sNama = document.getElementById('sNama');
            iNama.innerHTML = sNama.innerHTML = '<option value="">PILIH WARGA</option>';
            
            dbGlobal.anggota.forEach(w => {
                // Kolom 'Nama' di sheet ANGGOTA
                const opt = '<option value="' + w.Nama + '">' + w.Nama.toUpperCase() + '</option>';
                iNama.insertAdjacentHTML('beforeend', opt);
                sNama.insertAdjacentHTML('beforeend', opt);
            });
            renderDataTabel();
        })
        .catch(function(err) { 
            hideLoading(); 
            console.error("Detail Error:", err);
            tuntasAlert("Error", "Gagal load data dari server.", "error"); 
        });
}

// LOGIKA RENDER SINKRON DENGAN STRUKTUR KOLOM BARU SHEET 1 & SHEET 2
function renderDataTabel() {
    const tMulai = new Date(document.getElementById('fMulai').value);
    const tSelesai = new Date(document.getElementById('fSelesai').value);
    tSelesai.setHours(23,59,59,999);

    let s_selamanya = 0, f_masuk = 0, f_keluar = 0;
    const cont = document.getElementById('listRiwayat');
    cont.innerHTML = "";

    // Render Data SHEET 1 (KAS): Tanggal, Kategori, Keterangan, Nominal
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

    // Render Data SHEET 2 (ANGGOTA): Nama, Hp, Password, Foto, Bergabung
    const cWarga = document.getElementById('tBodyWarga'); cWarga.innerHTML = "";
    dbGlobal.anggota.forEach(w => {
        cWarga.innerHTML += '<div class="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl animate-fade-in">' +
            '<div><p class="text-xs font-black text-slate-800 uppercase">' + w.Nama + '</p><p class="text-[9px] text-slate-400 font-bold mt-0.5"><i class="fa-brands fa-whatsapp"></i> ' + (w.Hp || '-') + '</p></div>' +
            '<button onclick="hapusTrx(\'anggota\', \'' + w.id + '\')" class="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500"><span class="material-symbols-rounded !text-md">delete</span></button>' +
        '</div>';
    });
    
    if(dbGlobal.anggota.length === 0) {
        cWarga.innerHTML = '<p class="text-center text-[11px] text-slate-400 py-4 font-semibold">Belum ada data warga.</p>';
    }

    // Render Data SHEET 2 (PEMBAYARAN): Kode, Nama, Tanggal, Keterangan, Nominal
    const tbRekap = document.getElementById('tb-rekap'); tbRekap.innerHTML = "";
    dbGlobal.anggota.forEach(w => {
        let tr = '<tr><td class="sticky-col p-3 border-b text-slate-700 uppercase font-black">' + w.Nama + '</td>';
        daftarBulan.forEach(bln => {
            // Mengecek apakah bulan tercatat di kolom Keterangan pembayaran iuran warga tersebut
            const lunas = dbGlobal.pembayaran.some(p => p.Nama && w.Nama && p.Nama.toLowerCase() === w.Nama.toLowerCase() && p.Keterangan && p.Keterangan.includes(bln));
            tr += '<td class="text-center border-b p-2"><span class="inline-block w-5 h-5 rounded-md ' + (lunas ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-300') + ' font-black text-[10px] flex items-center justify-center mx-auto">' + (lunas ? '✓' : '—') + '</span></td>';
        });
        tr += '<td class="text-center border-b p-2"><button onclick="bukaDetailIuranWarga(\'' + w.Nama + '\')" class="text-emerald-700 font-black text-[10px] hover:underline">LIHAT</button></td></tr>';
        tbRekap.insertAdjacentHTML('beforeend', tr);
    });

    if(dbGlobal.anggota.length === 0) {
        tbRekap.innerHTML = '<tr><td colspan="14" class="text-center p-4 text-slate-400 font-semibold">Data masih kosong.</td></tr>';
    }
}

function postToSheets(fd, msg) {
    showLoading();
    fetch(SCRIPT_URL, { method: 'POST', body: fd })
        .then(res => res.json())
        .then(res => { 
            hideLoading(); 
            tuntasAlert("Berhasil", msg); 
            reloadData(); 
        })
        .catch(() => { 
            hideLoading(); 
            tuntasAlert("Gagal", "Koneksi terputus dengan gerbang Spreadsheet", "error"); 
        });
}

// Tambah Kas ke Sheet 1 (KAS)
function simpanKas() {
    const tgl = document.getElementById('kTgl').value;
    const kat = document.getElementById('kKat').value;
    const ket = document.getElementById('kKet').value.trim();
    const nom = document.getElementById('kNom').value;
    if(!tgl || !ket || !nom) return tuntasAlert("Error", "Isi semua form input kas!", "error");
    
    const fd = new FormData(); 
    fd.append('action', 'insertKas'); 
    fd.append('Tanggal', tgl); 
    fd.append('Kategori', kat); 
    fd.append('Keterangan', ket); 
    fd.append('Nominal', nom);
    
    closeModal('mKas'); 
    postToSheets(fd, "Kas umum berhasil dicatat ke Spreadsheet 1!");
}

// Tambah Warga ke Sheet 2 (ANGGOTA)
function simpanAnggota() {
    const name = document.getElementById('aNama').value.trim();
    const hp = document.getElementById('aHp').value.trim();
    if(!name || !hp) return tuntasAlert("Error", "Lengkapi data nama dan nomor WhatsApp!", "error");
    
    const fd = new FormData(); 
    fd.append('action', 'insertAnggota'); 
    fd.append('Nama', name); 
    fd.append('Hp', hp);
    fd.append('Password', '12345'); // Default password
    fd.append('Foto', '-');
    fd.append('Bergabung', new Date().toISOString().split('T')[0]);
    
    closeModal('mAnggota'); 
    postToSheets(fd, "Data warga berhasil ditambahkan ke Spreadsheet 2!");
}

// Tambah Iuran ke Sheet 2 (PEMBAYARAN)
function simpanIuran() {
    const nama = document.getElementById('iNama').value;
    const nominal = document.getElementById('iNom').value;
    const tgl = document.getElementById('iTgl').value;
    const bulan = Array.from(document.querySelectorAll('input[name="blnCek"]:checked')).map(c => c.value);
    if(!nama || !nominal || bulan.length === 0) return tuntasAlert("Error", "Lengkapi nama warga, nominal, dan pilihan bulan!", "error");

    const noRef = "T-" + Math.floor(100000 + Math.random() * 900000);
    const fd = new FormData(); 
    fd.append('action', 'insertPembayaran'); 
    fd.append('Kode', noRef); 
    fd.append('Nama', nama); 
    fd.append('Tanggal', tgl); 
    fd.append('Keterangan', "Iuran Bulan: " + bulan.join(', ')); 
    fd.append('Nominal', nominal); 

    const target = dbGlobal.anggota.find(w => w.Nama && w.Nama.toLowerCase() === nama.toLowerCase());
    if(target && target.Hp) {
        const txt = "Halo, pak/bu *" + nama.toUpperCase() + "*..\nPembayaran Anda telah kami terima dengan no referensi *" + noRef + "*.\n\n---------------------------\nCek e-Kuitansi Anda di:\nhttps://domain.com/kuitansi.html?id=" + noRef + "\n---------------------------\n\nTerimakasih atas partisipasinya.\n\nPengurus TUNTAS,\n\n*APRIL*";
        window.open("https://wa.me/" + target.Hp + "?text=" + encodeURIComponent(txt), '_blank');
    }
    postToSheets(fd, "Iuran tercatat! No Ref: " + noRef);
    document.querySelectorAll('input[name="blnCek"]').forEach(c => c.checked = false);
    document.getElementById('iNom').value = "";
}

// Tambah Laporan Sampah ke Sheet 2 (SAMPAH)
function simpanLaporanSampah() {
    const tgl = document.getElementById('sTgl').value;
    const nama = document.getElementById('sNama').value;
    const status = document.querySelector('input[name="sStatus"]:checked').value;
    if(!tgl || !nama) return tuntasAlert("Error", "Lengkapi tanggal operasional dan nama warga!", "error");

    const fd = new FormData();
    fd.append('action', 'insertSampah');
    fd.append('Tanggal', tgl);
    fd.append('Nama', nama);
    fd.append('Status', status);
    
    postToSheets(fd, "Laporan Operasional Sampah berhasil dicatat!");
}

function hapusTrx(kelompok, id) {
    tuntasConfirm("Hapus data ini secara permanen?", function() {
        const fd = new FormData(); 
        fd.append('action', 'deleteData'); 
        fd.append('type', kelompok); 
        fd.append('id', id);
        postToSheets(fd, "Data berhasil dihapus dari server.");
    });
}

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

function logout() { 
    tuntasConfirm("Keluar dari area sistem administrator?", function() { 
        window.location.href = "index.html"; 
    }); 
}

window.onload = init;
