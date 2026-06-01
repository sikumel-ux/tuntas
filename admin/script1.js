/**
 * TUNTAS ADMIN PANEL - LOGIC ENGINE
 */

// PENTING: Ganti URL di bawah dengan URL Web App milik akun Google kamu yang baru!
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwI8UM92CtLbTAE5F8UVjnm3qT-8ITco_-bPIQIjBfokGojFhYkRfl0YP9zCpVaRfTIpg/exec";
const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

let dbGlobal = { kas: [], pembayaran: [], anggota: [], sampah: [] };
let onConfirmSuccess = null;

function showLoading() { document.getElementById('global-loading').style.display = 'flex'; }
function hideLoading() { document.getElementById('global-loading').style.display = 'none'; }

// CUSTOM DIALOG ALERT SYSTEM
function tuntasAlert(title, message, type = 'success') {
    const el = document.getElementById('customAlert');
    const icon = document.getElementById('alertIcon');
    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMsg').innerText = message;
    
    if (type === 'error') {
        icon.className = "w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-red-50 text-red-600";
        icon.innerHTML = '<span class="material-symbols-rounded">gpp_maybe</span>';
    } else {
        icon.className = "w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600";
        icon.innerHTML = '<span class="material-symbols-rounded">check_circle</span>';
    }
    el.style.display = 'flex';
}

function closeAlert() { document.getElementById('customAlert').style.display = 'none'; }

// CUSTOM CONFIRMATION ACTION SYSTEM
function tuntasConfirm(message, onYes) {
    document.getElementById('confirmMsg').innerText = message;
    onConfirmSuccess = onYes;
    document.getElementById('customConfirm').style.display = 'flex';
}

function closeConfirm() { document.getElementById('customConfirm').style.display = 'none'; onConfirmSuccess = null; }

document.getElementById('confirmBtnOk').onclick = function() {
    if (onConfirmSuccess) onConfirmSuccess();
    closeConfirm();
};

// SINKRONISASI DATABASE GOOGLE SHEETS
async function loadDataDariSheets() {
    try {
        showLoading();
        let res = await fetch(SCRIPT_URL);
        let json = await res.json();
        if (json.status === "success") {
            dbGlobal = json.data;
            populasiDropdownDanWarga();
            renderDataTabel();
        } else {
            tuntasAlert("Gagal Sinkron", json.message || "Gagal menarik data database.", "error");
        }
    } catch (err) {
        tuntasAlert("Koneksi Putus", "Gagal terhubung ke Google Sheets API.", "error");
    } finally {
        hideLoading();
    }
}

// POPULASI DROPDOWN & KARTU DAFTAR WARGA ALFABETIS
function populasiDropdownDanWarga() {
    const arrAnggota = dbGlobal.anggota || [];
    const selectIuran = document.getElementById('iNama');
    const selectSampah = document.getElementById('sNama');
    
    selectIuran.innerHTML = '<option value="">PILIH WARGA</option>';
    selectSampah.innerHTML = '<option value="">PILIH WARGA</option>';
    
    arrAnggota.sort((a,b) => {
        let nA = a.Nama || a.nama || '';
        let nB = b.Nama || b.nama || '';
        return nA.toString().localeCompare(nB.toString());
    });

    const bodyWarga = document.getElementById('tBodyWarga');
    bodyWarga.innerHTML = arrAnggota.length === 0 ? '<p class="text-center text-[11px] text-slate-400 py-4 font-semibold">Belum ada data warga.</p>' : '';

    arrAnggota.forEach(w => {
        let namaWarga = w.Nama || w.nama;
        let hpWarga = w.Hp || w.hp || '-';
        if(namaWarga) {
            let cleanNama = namaWarga.toString().trim().toUpperCase();
            let opt = `<option value="${cleanNama}">${cleanNama}</option>`;
            selectIuran.insertAdjacentHTML('beforeend', opt);
            selectSampah.insertAdjacentHTML('beforeend', opt);

            let card = `
                <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex justify-between items-center">
                    <div>
                        <h4 class="font-black text-xs text-slate-800 uppercase">${cleanNama}</h4>
                        <p class="text-[10px] text-slate-400 font-semibold mt-0.5">WA: +${hpWarga}</p>
                    </div>
                    <span class="material-symbols-rounded text-slate-300 text-lg">arrow_forward_ios</span>
                </div>`;
            bodyWarga.insertAdjacentHTML('beforeend', card);
        }
    });
}

// FILTER & RENDER HISTORI MUTASI KAS UMUM/IURAN
function renderDataTabel() {
    const tMulai = document.getElementById('fMulai').value;
    const tSelesai = document.getElementById('fSelesai').value;
    
    let rawKas = dbGlobal.kas || [];
    let rawBayar = dbGlobal.pembayaran || [];

    let totalKasMasukSelamanya = rawKas.filter(k => (k.Kategori||k.kategori||'').toLowerCase() === 'masuk').reduce((acc, c) => acc + Number(c.Nominal||c.nominal||0), 0);
    let totalKasKeluarSelamanya = rawKas.filter(k => (k.Kategori||k.kategori||'').toLowerCase() === 'keluar').reduce((acc, c) => acc + Number(c.Nominal||c.nominal||0), 0);
    let totalIuranSelamanya = rawBayar.reduce((acc, c) => acc + Number(c.Nominal||c.nominal||0), 0);
    let saldoBersihSelamanya = (totalKasMasukSelamanya + totalIuranSelamanya) - totalKasKeluarSelamanya;
    
    document.getElementById('saldoSelamanya').innerText = "Rp " + saldoBersihSelamanya.toLocaleString('id-ID');

    let combinedTrx = [];
    rawKas.forEach(k => {
        let tgl = k.Tanggal || k.tanggal || '';
        if(tgl.includes('T')) tgl = tgl.split('T')[0];
        combinedTrx.push({
            tanggal: tgl,
            kategori: (k.Kategori||k.kategori||'').toLowerCase(),
            keterangan: (k.Keterangan || k.keterangan || k['Keterangan '] || '').toString().toUpperCase(),
            nominal: Number(k.Nominal || k.nominal || 0)
        });
    });

    rawBayar.forEach(p => {
        let tgl = p.Tanggal || p.tanggal || '';
        if(tgl.includes('T')) tgl = tgl.split('T')[0];
        let nama = p.Nama || p.nama || '';
        let ket = p.Keterangan || p.keterangan || '';
        combinedTrx.push({
            tanggal: tgl,
            kategori: 'masuk',
            keterangan: `IURAN ${nama.toString().toUpperCase()} (${ket.toString().toUpperCase()})`,
            nominal: Number(p.Nominal || p.nominal || 0)
        });
    });

    combinedTrx.sort((a,b) => b.tanggal.localeCompare(a.tanggal));

    let filteredTrx = combinedTrx.filter(t => t.tanggal >= tMulai && t.tanggal <= tSelesai);
    
    let masukFilter = 0;
    let keluarFilter = 0;
    
    const containerRiwayat = document.getElementById('listRiwayat');
    containerRiwayat.innerHTML = filteredTrx.length === 0 ? '<p class="text-center text-[11px] text-slate-400 py-4 font-semibold">Belum ada data transaksi.</p>' : '';

    filteredTrx.forEach(t => {
        if(t.kategori === 'masuk') masukFilter += t.nominal;
        else keluarFilter += t.nominal;

        let badgeColor = t.kategori === 'masuk' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50';
        let sign = t.kategori === 'masuk' ? '+' : '-';
        
        let card = `
            <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex justify-between items-center">
                <div class="space-y-0.5">
                    <span class="text-[8px] px-2 py-0.5 font-bold rounded-md ${badgeColor} uppercase">${t.kategori}</span>
                    <h4 class="font-black text-xs text-slate-800 pt-1">${t.keterangan}</h4>
                    <p class="text-[9px] text-slate-400 font-semibold">${t.tanggal}</p>
                </div>
                <p class="text-xs font-black text-slate-800">${sign} Rp ${t.nominal.toLocaleString('id-ID')}</p>
            </div>`;
        containerRiwayat.insertAdjacentHTML('beforeend', card);
    });

    let saldoFilter = masukFilter - keluarFilter;
    document.getElementById('totalSaldo').innerText = "Rp " + saldoFilter.toLocaleString('id-ID');
    document.getElementById('totalMasuk').innerText = "Rp " + masukFilter.toLocaleString('id-ID');
    document.getElementById('totalKeluar').innerText = "Rp " + keluarFilter.toLocaleString('id-ID');

    renderMatriksIuran();
}

// RENDER MATRIKS MATRIK MONITORING BULANAN IURAN
function renderMatriksIuran() {
    const arrAnggota = dbGlobal.anggota || [];
    const arrBayar = dbGlobal.pembayaran || [];
    const tb = document.getElementById('tb-rekap');
    tb.innerHTML = arrAnggota.length === 0 ? '<tr><td colspan="14" class="text-center p-4 text-slate-400 font-semibold">Data masih kosong.</td></tr>' : '';

    arrAnggota.forEach(w => {
        let namaWarga = (w.Nama || w.nama || '').toString().trim().toUpperCase();
        if(!namaWarga) return;

        let rowHtml = `<tr class="border-b hover:bg-slate-50"><td class="sticky-col p-3 font-black text-slate-700 uppercase">${namaWarga}</td>`;
        
        daftarBulan.forEach(bln => {
            let lunas = arrBayar.some(p => {
                let pNama = (p.Nama || p.nama || '').toString().trim().toUpperCase();
                let pKet = (p.Keterangan || p.keterangan || '').toString().trim().toUpperCase();
                return pNama === namaWarga && pKet === bln.toUpperCase();
            });

            if(lunas) {
                rowHtml += `<td class="text-center p-2"><span class="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-1 rounded-md uppercase">LUNAS</span></td>`;
            } else {
                rowHtml += `<td class="text-center p-2"><span class="bg-rose-50 text-rose-500 text-[9px] font-bold px-2 py-1 rounded-md uppercase">BELUM</span></td>`;
            }
        });

        rowHtml += `
            <td class="text-center p-2">
                <button onclick="bukaDetailWarga('${namaWarga}')" class="bg-slate-900 text-white font-bold text-[9px] px-2 py-1 rounded-md uppercase">Detail</button>
            </td></tr>`;
        tb.insertAdjacentHTML('beforeend', rowHtml);
    });
}

// MODAL DETAIL AKUMULASI RIWAYAT IURAN PER WARGA
function bukaDetailWarga(nama) {
    document.getElementById('mdTitle').innerText = `RIWAYAT IURAN: ${nama}`;
    const list = document.getElementById('mdList');
    list.innerHTML = '';
    
    let bayarWarga = (dbGlobal.pembayaran || []).filter(p => (p.Nama||p.nama||'').toString().trim().toUpperCase() === nama);
    if(bayarWarga.length === 0) {
        list.innerHTML = '<p class="text-center text-slate-400 py-2 font-semibold">Belum pernah bayar iuran.</p>';
    } else {
        bayarWarga.forEach(p => {
            let tgl = p.Tanggal || p.tanggal || '';
            if(tgl.includes('T')) tgl = tgl.split('T')[0];
            list.innerHTML += `
                <div class="p-3 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-100">
                    <div>
                        <p class="font-black text-slate-800">Bulan ${p.Keterangan || p.keterangan}</p>
                        <p class="text-[9px] text-slate-400 font-medium">${tgl} | ${p.Kode || p.kode || '-'}</p>
                    </div>
                    <p class="font-black text-emerald-800">Rp ${Number(p.Nominal||p.nominal||0).toLocaleString('id-ID')}</p>
                </div>`;
        });
    }
    openModal('mDetailIuran');
}

// GATEWAY PIPELINE DATA KE GOOGLE APP SCRIPT (POST)
async function kirimKeSheets(payload) {
    try {
        showLoading();
        let res = await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        let json = await res.json();
        return json.status === "success";
    } catch (err) {
        tuntasAlert("Koneksi Gagal", "Gagal mengirimkan data transaksi.", "error");
        return false;
    } finally {
        hideLoading();
    }
}

// AKSI SIMPAN FORM KAS UMUM
async function simpanKas() {
    const tgl = document.getElementById('kTgl').value;
    const kat = document.getElementById('kKat').value;
    const ket = document.getElementById('kKet').value.trim();
    const nom = document.getElementById('kNom').value;

    if(!tgl || !ket || !nom) {
        return tuntasAlert("Lengkapi Data", "Form input kas wajib diisi semua!", "error");
    }

    let sukses = await kirimKeSheets({
        action: "simpanKas", tanggal: tgl, kategori: kat, keterangan: ket, nominal: nom
    });

    if(sukses) {
        closeModal('mKas');
        document.getElementById('kKet').value = "";
        document.getElementById('kNom').value = "";
        tuntasAlert("Sukses", "Transaksi Kas Berhasil Disimpan.");
        await loadDataDariSheets();
    }
}

// AKSI SIMPAN FORM PEMBAYARAN IURAN MULTI-BULAN
async function simpanIuran() {
    const tgl = document.getElementById('iTgl').value;
    const nama = document.getElementById('iNama').value;
    const nom = document.getElementById('iNom').value;
    const blns = Array.from(document.querySelectorAll('input[name="blnCek"]:checked')).map(c => c.value);
    
    if(!tgl || !nama || !nom || blns.length === 0) {
        return tuntasAlert("Lengkapi Data", "Silakan tentukan warga, nominal, dan bulan iurannya!", "error");
    }

    showLoading();
    let errorCount = 0;

    for (let bln of blns) {
        let kodeUnik = "TRX-" + Date.now().toString().slice(-6) + Math.floor(Math.random()*10);
        let sukses = await kirimKeSheets({
            action: "simpanPembayaran", kode: kodeUnik, nama: nama, tanggal: tgl, keterangan: bln, nominal: nom
        });
        if(!sukses) errorCount++;
    }

    if(errorCount === 0) {
        document.getElementById('iNom').value = "";
        document.querySelectorAll('input[name="blnCek"]').forEach(c => c.checked = false);
        tuntasAlert("Sukses", `Seluruh pembayaran iuran ${nama} berhasil dicatat.`);
        await loadDataDariSheets();
    } else {
        tuntasAlert("Eror Sebagian", "Ada beberapa iuran bulan gagal tersimpan.", "error");
    }
}

// AKSI SIMPAN FORM OPERASIONAL TRUK SAMPAH
async function simpanLaporanSampah() {
    const tgl = document.getElementById('sTgl').value;
    const nama = document.getElementById('sNama').value;
    const status = document.querySelector('input[name="sStatus"]:checked').value;

    if(!tgl || !nama) {
        return tuntasAlert("Lengkapi Data", "Silakan tentukan tanggal operasional dan nama warga!", "error");
    }

    let sukses = await kirimKeSheets({
        action: "simpanSampah", tanggal: tgl, nama: nama, status: status
    });

    if(sukses) {
        tuntasAlert("Sukses", `Laporan sampah ${nama} diatur: ${status}`);
        await loadDataDariSheets();
    }
}

// AKSI REGISTER ANGGOTA/WARGA BARU V_DEFAULT
async function simpanAnggota() {
    const nama = document.getElementById('aNama').value.trim().toUpperCase();
    const hp = document.getElementById('aHp').value.trim();

    if(!nama || !hp) return tuntasAlert("Lengkapi Data", "Isi nama lengkap dan nomor telepon warga!", "error");

    let sukses = await kirimKeSheets({
        action: "simpanAnggota", nama: nama, hp: hp, password: "123"
    });

    if(sukses) {
        closeModal('mAnggota');
        document.getElementById('aNama').value = "";
        document.getElementById('aHp').value = "";
        tuntasAlert("Sukses", `Warga baru ${nama} berhasil didaftarkan.`);
        await loadDataDariSheets();
    }
}

// EXPORT PDF TRANSAKSI LAPORAN KAS
function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const tglAwal = document.getElementById('fMulai').value;
    const tglAkhir = document.getElementById('fSelesai').value;

    let combinedTrx = [];
    (dbGlobal.kas || []).forEach(k => {
        let tgl = k.Tanggal || k.tanggal || '';
        if(tgl.includes('T')) tgl = tgl.split('T')[0];
        combinedTrx.push([tgl, (k.Keterangan||k['Keterangan ']).toString().toUpperCase(), (k.Kategori).toUpperCase(), `Rp ${Number(k.Nominal).toLocaleString('id-ID')}`]);
    });
    
    let dataFiltered = combinedTrx.filter(item => item[0] >= tglAwal && item[0] <= tglAkhir);

    if(dataFiltered.length === 0) return tuntasAlert("Data Kosong", "Tidak ada transaksi untuk dicetak pada rentang tanggal ini.", "error");

    doc.setFontSize(20); doc.setTextColor(6, 78, 59); doc.setFont("helvetica", "bold");
    doc.text("TUNTAS. ADMIN REPORT", 14, 20);
    doc.setFontSize(9); doc.setTextColor(100);
    doc.text(`Periode Rekap: ${tglAwal} s/d ${tglAkhir}`, 14, 27);

    doc.autoTable({
        startY: 34, head: [['Tanggal', 'Keterangan', 'Kategori', 'Nominal']], body: dataFiltered,
        headStyles: { fillColor: [6, 78, 59] }
    });

    doc.save(`Rekap_Kas_Tuntas_${tglAwal}_${tglAkhir}.pdf`);
}

// INITIALIZATION DATA SETTINGS (FIRST LOAD)
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
    thr.innerHTML = '<th class="sticky-col p-3 bg-white z-20">Nama</th>';
    
    daftarBulan.forEach(bln => {
        grid.innerHTML += `<label class="relative block"><input type="checkbox" name="blnCek" value="${bln}" class="hidden peer"><div class="cursor-pointer text-[9px] font-black py-3 text-center border rounded-xl bg-white text-slate-300 peer-checked:bg-emerald-900 peer-checked:text-white uppercase transition-all">${bln.substring(0,3)}</div></label>`;
        thr.innerHTML += `<th class="text-center p-2 font-bold text-slate-400">${bln.substring(0,3)}</th>`;
    });
    thr.innerHTML += '<th class="text-center p-2 font-bold text-slate-400">AKSI</th>';
    
    loadDataDariSheets();
}

function reloadData() { loadDataDariSheets(); }
function logout() { tuntasConfirm("Apakah Anda yakin ingin keluar?", () => window.location.reload()); }

// BOTTOM TAB NAVIGATION FLOW SWITCHER
function st(t) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('screen-'+t).classList.add('active');
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    document.getElementById('n-'+t).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openModal(id) { document.getElementById(id).style.display='flex'; }
function closeModal(id) { document.getElementById(id).style.display='none'; }

window.onload = init;
