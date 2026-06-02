// URL REST API Google Apps Script & SDK Firebase Integration Engine
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx9JsUb0saYvFnH8vpCn2JZu_AzdrXXXmQIcGfMW0dsTvPndFQC_CtKyLhMx_6Kjd_IEg/exec";

const firebaseConfig = {
    apiKey: "AIzaSyCzz0INhgBUARAxqLlMnCC8vyCciI9jpJk",
    authDomain: "tuntas-04.firebaseapp.com",
    databaseURL: "https://tuntas-04-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tuntas-04",
    storageBucket: "tuntas-04.firebasestorage.app",
    messagingSenderId: "509433415219",
    appId: "1:509433415219:web:e485a0eab1a612fda64546"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const dbFirebase = firebase.database();

const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
let dbGlobal = { kas: [], pembayaran: [], anggota: [] };
let onConfirmSuccess = null;

function showLoading() { document.getElementById('loading').style.display = 'flex'; }
function hideLoading() { document.getElementById('loading').style.display = 'none'; }

// Sinkronisasi DOM & CSS Active Figma Glassmorphism
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

function reloadData() {
    showLoading();
    var urlAmbilData = SCRIPT_URL + "?action=readAllData";
    
    fetch(urlAmbilData)
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
            
            const iNama = document.getElementById('iNama');
            const sNama = document.getElementById('sNama');
            iNama.innerHTML = sNama.innerHTML = '<option value="">PILIH WARGA</option>';
            
            dbGlobal.anggota.forEach(w => {
                const opt = '<option value="' + w.nama + '">' + w.nama.toUpperCase() + '</option>';
                iNama.insertAdjacentHTML('beforeend', opt);
                sNama.insertAdjacentHTML('beforeend', opt);
            });
            renderDataTabel();
        })
        .catch(function() { 
            hideLoading(); 
            tuntasAlert("Error", "Gagal load data dari server. Periksa koneksi internet Anda.", "error"); 
        });
}

function renderDataTabel() {
    const tMulai = new Date(document.getElementById('fMulai').value);
    const tSelesai = new Date(document.getElementById('fSelesai').value);
    tSelesai.setHours(23,59,59,999);

    let s_selamanya = 0, f_masuk = 0, f_keluar = 0;
    const cont = document.getElementById('listRiwayat');
    cont.innerHTML = "";

    dbGlobal.kas.forEach(trx => {
        const nil = parseFloat(trx.jumlah || 0);
        const isMsk = trx.jenis.toLowerCase() === 'masuk';
        if(isMsk) s_selamanya += nil; else s_selamanya -= nil;

        const tTrx = new Date(trx.tanggal);
        if(tTrx >= tMulai && tTrx <= tSelesai) {
            if(isMsk) f_masuk += nil; else f_keluar += nil;
            cont.innerHTML += '<div class="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-2xl animate-fade-in">' +
                '<div><p class="text-xs font-black uppercase text-slate-700">' + trx.keterangan + '</p><p class="text-[9px] font-bold text-slate-400 mt-0.5">' + trx.tanggal + '</p></div>' +
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

    const cWarga = document.getElementById('tBodyWarga'); cWarga.innerHTML = "";
    dbGlobal.anggota.forEach(w => {
        cWarga.innerHTML += '<div class="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl animate-fade-in">' +
            '<div><p class="text-xs font-black text-slate-800 uppercase">' + w.nama + '</p><p class="text-[9px] text-slate-400 font-bold mt-0.5"><i class="fa-brands fa-whatsapp"></i> ' + (w.hp || '-') + '</p></div>' +
            '<button onclick="hapusTrx(\'anggota\', \'' + w.id + '\')" class="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500"><span class="material-symbols-rounded !text-md">delete</span></button>' +
        '</div>';
    });
    
    if(dbGlobal.anggota.length === 0) {
        cWarga.innerHTML = '<p class="text-center text-[11px] text-slate-400 py-4 font-semibold">Belum ada data warga.</p>';
    }

    const tbRekap = document.getElementById('tb-rekap'); tbRekap.innerHTML = "";
    dbGlobal.anggota.forEach(w => {
        let tr = '<tr><td class="sticky-col p-3 border-b text-slate-700 uppercase font-black">' + w.nama + '</td>';
        daftarBulan.forEach(bln => {
            const lunas = dbGlobal.pembayaran.some(p => p.nama.toLowerCase() === w.nama.toLowerCase() && p.bulan === bln);
            tr += '<td class="text-center border-b p-2"><span class="inline-block w-5 h-5 rounded-md ' + (lunas ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-300') + ' font-black text-[10px] flex items-center justify-center mx-auto">' + (lunas ? '✓' : '—') + '</span></td>';
        });
        tr += '<td class="text-center border-b p-2"><button onclick="bukaDetailIuranWarga(\'' + w.nama + '\')" class="text-emerald-700 font-black text-[10px] hover:underline">LIHAT</button></td></tr>';
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

function simpanKas() {
    const tgl = document.getElementById('kTgl').value;
    const kat = document.getElementById('kKat').value;
    const ket = document.getElementById('kKet').value.trim();
    const nom = document.getElementById('kNom').value;
    if(!tgl || !ket || !nom) return tuntasAlert("Error", "Isi semua form input kas!", "error");
    
    const fd = new FormData(); 
    fd.append('action', 'insertKas'); 
    fd.append('tanggal', tgl); 
    fd.append('jenis', kat); 
    fd.append('keterangan', ket); 
    fd.append('jumlah', nom);
    
    closeModal('mKas'); 
    postToSheets(fd, "Kas umum berhasil dicatat!");
}

function simpanAnggota() {
    const name = document.getElementById('aNama').value.trim();
    const hp = document.getElementById('aHp').value.trim();
    if(!name || !hp) return tuntasAlert("Error", "Lengkapi data nama dan nomor WhatsApp!", "error");
    
    const fd = new FormData(); 
    fd.append('action', 'insertAnggota'); 
    fd.append('nama', name); 
    fd.append('hp', hp);
    
    closeModal('mAnggota'); 
    postToSheets(fd, "Data warga berhasil ditambahkan!");
}

function simpanIuran() {
    const nama = document.getElementById('iNama').value;
    const nominal = document.getElementById('iNom').value;
    const tgl = document.getElementById('iTgl').value;
    const bulan = Array.from(document.querySelectorAll('input[name="blnCek"]:checked')).map(c => c.value);
    if(!nama || !nominal || bulan.length === 0) return tuntasAlert("Error", "Lengkapi nama warga, nominal, dan pilihan bulan!", "error");

    const noRef = "T-" + Math.floor(100000 + Math.random() * 900000);
    const fd = new FormData(); 
    fd.append('action', 'insertPembayaran'); 
    fd.append('tanggal', tgl); 
    fd.append('nama', nama); 
    fd.append('bulan', bulan.join(', ')); 
    fd.append('jumlah', nominal); 
    fd.append('referensi', noRef);

    const target = dbGlobal.anggota.find(w => w.nama.toLowerCase() === nama.toLowerCase());
    if(target && target.hp) {
        const txt = "Halo, pak/bu *" + nama.toUpperCase() + "*..\nPembayaran Anda telah kami terima dengan no referensi *" + noRef + "*.\n\n---------------------------\nCek e-Kuitansi Anda di:\nhttps://domain.com/kuitansi.html?id=" + noRef + "\n---------------------------\n\nTerimakasih atas partisipasinya.\n\nPengurus TUNTAS,\n\n*APRIL*";
        window.open("https://wa.me/" + target.hp + "?text=" + encodeURIComponent(txt), '_blank');
    }
    postToSheets(fd, "Iuran tercatat! No Ref: " + noRef);
    document.querySelectorAll('input[name="blnCek"]').forEach(c => c.checked = false);
    document.getElementById('iNom').value = "";
}

function simpanLaporanSampah() {
    const tgl = document.getElementById('sTgl').value;
    const nama = document.getElementById('sNama').value;
    const status = document.querySelector('input[name="sStatus"]:checked').value;
    if(!tgl || !nama) return tuntasAlert("Error", "Lengkapi tanggal operasional dan nama warga!", "error");

    showLoading();
    const parsed = new Date(tgl);
    const pathBulan = parsed.getFullYear() + "-" + (parsed.getMonth() + 1).toString().padStart(2, '0');
    const hari = parsed.getDate();
    const jm = new Date().getHours().toString().padStart(2,'0') + ":" + new Date().getMinutes().toString().padStart(2,'0');

    dbFirebase.ref("data_sampah/" + nama.toUpperCase() + "/" + pathBulan + "/" + hari).set({ status: status, waktu: jm }, function(err) {
        if(err) { 
            hideLoading(); 
            tuntasAlert("Error", "Gagal simpan real-time data ke Firebase", "error"); 
        } else {
            const fd = new FormData();
            fd.append('action', 'insertSampah');
            fd.append('tanggal', tgl);
            fd.append('nama', nama);
            fd.append('status', status);
            
            fetch(SCRIPT_URL, { method: 'POST', body: fd })
                .then(function() { 
                    hideLoading(); 
                    tuntasAlert("Berhasil", "Laporan Operasional Sampah tersinkronisasi sempurna!"); 
                })
                .catch(function() { 
                    hideLoading(); 
                    tuntasAlert("Parsial", "Tersimpan di Firebase, gagal ke Backup Sheet.", "error"); 
                });
        }
    });
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
    const riwayat = dbGlobal.pembayaran.filter(p => p.nama.toLowerCase() === namaWarga.toLowerCase());
    
    if(riwayat.length > 0) {
        riwayat.forEach(r => {
            list.innerHTML += '<div class="p-2.5 bg-slate-50 rounded-xl flex justify-between items-center text-[11px] animate-fade-in">' +
                '<div><p class="font-black text-emerald-900">Periode: ' + r.bulan + '</p><p class="text-[9px] text-slate-400 font-bold">' + r.tanggal + '</p></div>' +
                '<div class="flex items-center gap-2"><span class="font-extrabold text-slate-700">' + formatRupiah(r.jumlah) + '</span>' +
                '<button onclick="closeModal(\'mDetailIuran\'); hapusTrx(\'pembayaran\', \'' + r.id + '\')" class="text-slate-300 hover:text-red-500"><span class="material-symbols-rounded !text-sm">delete</span></button></div>' +
            '</div>';
        });
    } else { 
        list.innerHTML = "<p class='text-center text-slate-400 py-4 font-semibold'>Belum ada riwayat pembayaran.</p>"; 
    }
    openModal('mDetailIuran');
}

// Navigasi SPA dengan pembersihan display CSS (Menghilangkan Tumpukan)
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
