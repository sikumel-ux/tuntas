/**
 * TUNTAS SYSTEM - FRONTEND ENGINE (script.js)
 * Fitur: Autentikasi Login, Render Dashboard Kas/Iuran, Kalender Sampah, 
 * Upload Foto Profil, & Format Tampilan Tanggal Bergabung Warga.
 */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzt1GIvQ2tMRz0rnBEgIoqq75858xW_xsbOf1TCDwAoADVmfeV61vVOMPxCvDIz1JG8/exec";

const labelBln = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
let sessionWarga = null; 
let sessionHpRaw = null; 
let dataSampahWargaCache = {};

function showLoading() { document.getElementById('loading').style.display = 'flex'; }
function hideLoading() { document.getElementById('loading').style.display = 'none'; }

// ENGINE CONTROL POPUP MODAL (SINKRON CSS)
function openModal(idModal) {
    const target = document.getElementById(idModal);
    if (target) target.style.display = 'flex';
}

function closeModal(idModal) {
    const target = document.getElementById(idModal);
    if (target) target.style.display = 'none';
}

function closeAlert() {
    closeModal('customAlert');
}

// CUSTOM ALERT DIALOG
function tuntasAlert(title, message, type = 'success') {
    const icon = document.getElementById('alertIcon');
    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMsg').innerText = message;
    if(type === 'error') {
        icon.className = "w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-red-50 text-red-600";
        icon.innerHTML = '<span class="material-symbols-rounded">gpp_maybe</span>';
    } else {
        icon.className = "w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600";
        icon.innerHTML = '<span class="material-symbols-rounded">check_circle</span>';
    }
    openModal('customAlert');
}

// PROGRAM AUTHENTIKASI LOGIN
async function prosesLoginWarga() {
    const hp = document.getElementById('lHp').value.trim();
    const pass = document.getElementById('lPass').value.trim();

    if(!hp || !pass) {
        tuntasAlert('Form Kosong', 'Nomor HP dan Kata Sandi wajib diisi ya, bro!', 'error');
        return;
    }

    showLoading();
    try {
        let res = await fetch(SCRIPT_URL);
        let json = await res.json();
        
        if (json.status === "success") {
            let listAnggota = json.data.anggota || [];
            let userFound = null;

            for(let item of listAnggota) {
                let dbHp = (item.Hp || item.hp || '').toString().trim();
                let dbPass = (item.Password || item.password || '123').toString().trim();
                
                if(dbHp === hp && dbPass === pass) {
                    userFound = item;
                    break;
                }
            }

            if(userFound) {
                sessionWarga = (userFound.Nama || userFound.nama || '').toString().trim().toUpperCase();
                sessionHpRaw = (userFound.Hp || userFound.hp || '').toString().trim();
                
                // Sinkronisasi pembersihan nomor HP dari tanda '+' untuk dipasang ke UI
                let cleanHpDisplay = sessionHpRaw;
                if (cleanHpDisplay.startsWith('+')) {
                    cleanHpDisplay = cleanHpDisplay.substring(1);
                }

                // 1. Mengambil data Bulan Bergabung dari kolom baru di Sheets
                let bulanBergabung = (userFound.Bergabung || userFound.bergabung || '').toString().trim();

                // PETA NAMA BULAN INDONESIA
                const namaBulanIndo = {
                  "01": "Januari", "02": "Februari", "03": "Maret", "04": "April",
                  "05": "Mei", "06": "Juni", "07": "Juli", "08": "Agustus",
                  "09": "September", "10": "Oktober", "11": "November", "12": "Desember"
                };

                // Logika konversi otomatis jika format di sheets terbaca tanggal YYYY-MM-DD
                if (bulanBergabung.includes("-")) {
                  let parts = bulanBergabung.split("-");
                  if (parts.length >= 2) {
                    let tahun = parts[0];
                    let kodeBulan = parts[1];
                    let namaBulan = namaBulanIndo[kodeBulan] || kodeBulan;
                    bulanBergabung = `${namaBulan} ${tahun}`;
                  }
                }

                // 2. Memasang data teks ke UI
                document.getElementById('topNamaWarga').innerText = sessionWarga;
                document.getElementById('topHpWarga').innerText = cleanHpDisplay;
                document.getElementById('infoNamaUser').innerText = sessionWarga;
                document.getElementById('infoHpUser').innerText = cleanHpDisplay;

                // 3. Mengubah tampilan badge bawah foto profil menjadi Bergabung Sejak
                const badgeBergabung = document.getElementById('infoBergabung');
                if (bulanBergabung) {
                    badgeBergabung.innerHTML = `<i class="fa-solid fa-calendar-check mr-1"></i> Bergabung Sejak ${bulanBergabung}`;
                } else {
                    badgeBergabung.innerHTML = `<i class="fa-solid fa-calendar-check mr-1"></i> Terdaftar Aktif`;
                }

                let dbFoto = userFound.Foto || userFound.foto || '';
                pasangFotoProfilUI(dbFoto);

                document.getElementById('screen-login').classList.add('hidden');
                document.getElementById('screen-dashboard').classList.remove('hidden');
                
                renderDashboardGlobal(json.data);
                loadDetailDataPribadi(); // Langsung tarik data iuran pribadi setelah login sukses
            } else {
                tuntasAlert("Gagal Masuk", "Nomor HP tidak ditemukan atau kata sandi Anda salah.", "error");
            }
        } else {
            tuntasAlert("Eror Database", "Gagal menghubungi database Google Sheets.", "error");
        }
    } catch (err) {
        tuntasAlert("Koneksi Terputus", "Periksa koneksi internet Anda.", "error");
    } finally {
        hideLoading();
    }
}

function pasangFotoProfilUI(urlAtauBase64) {
    const imgAvatar = document.getElementById('avatarImage');
    const imgMini = document.getElementById('miniAvatar');
    const iconDefault = document.getElementById('avatarIconDefault');
    
    if (urlAtauBase64 && (urlAtauBase64.startsWith('data:image') || urlAtauBase64.startsWith('http'))) {
        imgAvatar.src = urlAtauBase64;
        imgAvatar.classList.remove('hidden');
        iconDefault.classList.add('hidden');

        imgMini.src = urlAtauBase64;
        imgMini.classList.remove('hidden');
    } else {
        imgAvatar.classList.add('hidden');
        iconDefault.classList.remove('hidden');
        imgMini.classList.add('hidden');
    }
}

function renderDashboardGlobal(database) {
    let rawKas = database.kas || [];
    let rawBayar = database.pembayaran || [];

    let totalKasMasuk = rawKas.filter(k => (k.Kategori||k.kategori||'').toLowerCase() === 'masuk').reduce((acc, c) => acc + Number(c.Nominal||c.nominal||0), 0);
    let totalKasKeluar = rawKas.filter(k => (k.Kategori||k.kategori||'').toLowerCase() === 'keluar').reduce((acc, c) => acc + Number(c.Nominal||c.nominal||0), 0);
    let totalIuranMasuk = rawBayar.reduce((acc, c) => acc + Number(c.Nominal||c.nominal||0), 0);
    let sisaSaldoRealTime = (totalKasMasuk + totalIuranMasuk) - totalKasKeluar;

    document.getElementById('dashPemasukanKas').innerText = "Rp " + (totalKasMasuk + totalIuranMasuk).toLocaleString('id-ID');
    document.getElementById('dashPengeluaranKas').innerText = "Rp " + totalKasKeluar.toLocaleString('id-ID');
    document.getElementById('dashSisaSaldoKas').innerText = "Rp " + sisaSaldoRealTime.toLocaleString('id-ID');

    let combinedLog = [];
    rawKas.forEach(k => {
        let tgl = k.Tanggal || k.tanggal || '';
        if(tgl.includes('T')) tgl = tgl.split('T')[0];
        combinedLog.push({
            tanggal: tgl,
            kategori: (k.Kategori||k.kategori||'').toLowerCase(),
            keterangan: (k.Keterangan || k.keterangan || k['Keterangan '] || '').toString().toUpperCase(),
            nominal: Number(k.Nominal || k.nominal || 0)
        });
    });

    rawBayar.forEach(p => {
        let tgl = p.Tanggal || p.tanggal || '';
        if(tgl.includes('T')) tgl = tgl.split('T')[0];
        combinedLog.push({
            tanggal: tgl,
            kategori: 'masuk',
            keterangan: `IURAN ${ (p.Nama || p.nama || '').toString().toUpperCase() } (${ (p.Keterangan || p.keterangan || '').toString().toUpperCase() })`,
            nominal: Number(p.Nominal || p.nominal || 0)
        });
    });

    combinedLog.sort((a,b) => b.tanggal.localeCompare(a.tanggal));

    const containerLog = document.getElementById('listMutasiKasDashboard');
    containerLog.innerHTML = combinedLog.length === 0 ? '<p class="text-center text-[10px] py-4 text-slate-400">Belum ada mutasi kas.</p>' : '';
    
    combinedLog.slice(0, 15).forEach(item => {
        let badge = item.kategori === 'masuk' ? 'text-emerald-600' : 'text-rose-500';
        let tanda = item.kategori === 'masuk' ? '+' : '-';
        containerLog.innerHTML += `
            <div class="py-2.5 flex justify-between items-center text-xs">
                <div>
                    <p class="font-black text-slate-700 uppercase">${item.keterangan}</p>
                    <p class="text-[9px] text-slate-400">${item.tanggal}</p>
                </div>
                <span class="font-black ${badge}">${tanda} Rp ${item.nominal.toLocaleString('id-ID')}</span>
            </div>`;
    });
}

async function loadDetailDataPribadi() {
    if(!sessionWarga) return;
    showLoading();
    try {
        let res = await fetch(SCRIPT_URL);
        let json = await res.json();
        
        if(json.status === "success") {
            let rawBayar = json.data.pembayaran || [];
            let rawSampah = json.data.sampah || [];
            let bulanLunas = [];
            let totalKontribusiSaya = 0;
            
            const listHistori = document.getElementById('listRiwayatPribadi');
            listHistori.innerHTML = '';

            let bayarSaya = rawBayar.filter(p => (p.Nama||p.nama||'').toString().trim().toUpperCase() === sessionWarga);
            bayarSaya.sort((a,b) => (b.Tanggal||b.tanggal).localeCompare(a.Tanggal||a.tanggal));

            if(bayarSaya.length === 0) {
                listHistori.innerHTML = '<p class="text-center text-[11px] text-slate-400 py-2">Belum ada riwayat pembayaran.</p>';
            } else {
                bayarSaya.forEach(p => {
                    let nmn = Number(p.Nominal || p.nominal || 0);
                    let tgl = p.Tanggal || p.tanggal || '';
                    if(tgl.includes('T')) tgl = tgl.split('T')[0];
                    let blnTag = (p.Keterangan || p.keterangan || '').toString().trim();
                    
                    totalKontribusiSaya += nmn;
                    bulanLunas.push(blnTag.toUpperCase());

                    listHistori.innerHTML += `
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                            <div>
                                <p class="font-black text-slate-700 uppercase">IURAN BULAN ${blnTag.toUpperCase()}</p>
                                <p class="text-[9px] text-slate-400">Diterima: ${tgl}</p>
                            </div>
                            <span class="font-black text-slate-800">Rp ${nmn.toLocaleString('id-ID')}</span>
                        </div>`;
                });
            }
            document.getElementById('dataTotalKontribusi').innerText = "Rp " + totalKontribusiSaya.toLocaleString('id-ID');

            const gridIuran = document.getElementById('statusBulanGrid');
            gridIuran.innerHTML = '';
            labelBln.forEach(bln => {
                let lunas = bulanLunas.includes(bln.toUpperCase());
                gridIuran.innerHTML += `
                    <div class="p-3 rounded-xl text-center border ${lunas ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-300'} flex flex-col justify-center">
                        <span class="text-[10px] font-black uppercase leading-none">${bln.substring(0,3)}</span>
                        <span class="text-[7px] font-bold mt-1 tracking-tighter">${lunas ? 'LUNAS' : 'BELUM'}</span>
                    </div>`;
            });

            dataSampahWargaCache = {};
            let sekarang = new Date();
            
            rawSampah.forEach(s => {
                let sNama = (s.Nama || s.nama || '').toString().trim().toUpperCase();
                let sTgl = s.Tanggal || s.tanggal || '';
                if(sTgl.includes('T')) sTgl = sTgl.split('T')[0];
                
                if(sTgl) {
                    let dateObj = new Date(sTgl);
                    if(sNama === sessionWarga && dateObj.getMonth() === sekarang.getMonth() && dateObj.getFullYear() === sekarang.getFullYear()) {
                        let hariAngka = dateObj.getDate().toString();
                        dataSampahWargaCache[hariAngka] = {
                            status: s.Status || s.status || 'Kosong',
                            waktu: s.Waktu || s.waktu || '08:00'
                        };
                    }
                }
            });
            renderKalenderSampahRealTime();
        }
    } catch(e) {
        tuntasAlert("Gagal Sinkron", "Gagal memuat rekap data pribadi Anda.", "error");
    } finally {
        hideLoading();
    }
}

function renderKalenderSampahRealTime() {
    const gridBox = document.getElementById('gridAngkaKalender');
    if (!gridBox) return;
    gridBox.innerHTML = '';

    const sekarang = new Date();
    document.getElementById('judulKalenderSampah').innerText = `Kalender Sampah (${labelBln[sekarang.getMonth()]} ${sekarang.getFullYear()})`;
    const jumlahHari = new Date(sekarang.getFullYear(), Thermal = sekarang.getMonth() + 1, 0).getDate();

    for (let hari = 1; hari <= jumlahHari; hari++) {
        const detailHari = dataSampahWargaCache[hari.toString()] || null;
        const status = detailHari ? detailHari.status : "Belum Ada";
        const waktu = detailHari ? detailHari.waktu : "--:--";

        let bgStyle = "bg-slate-100 text-slate-400 border border-slate-200/40";
        let subTeks = "";

        if (status === "Diambil") {
            bgStyle = "bg-emerald-500 text-white shadow-xs";
            subTeks = `<span class="block text-[7px] font-black mt-0.5 opacity-90">${waktu}</span>`;
        } else if (status === "Tidak Diambil") {
            bgStyle = "bg-rose-500 text-white shadow-xs";
            subTeks = `<span class="block text-[7px] font-black mt-0.5 opacity-90">LEWAT</span>`;
        } else if (status === "Kosong") {
            bgStyle = "bg-slate-400 text-white";
            subTeks = `<span class="block text-[7px] font-black mt-0.5 opacity-80">KOSONG</span>`;
        }

        const htmlKotak = `
            <div onclick="bukaPopUpDetailSampah('${hari}', '${status}', '${waktu}')" 
                 class="p-2 py-3 rounded-xl text-center cursor-pointer active:scale-95 transition-all flex flex-col justify-center items-center h-14 ${bgStyle}">
                <span class="text-xs font-black">${hari}</span>
                ${subTeks}
            </div>`;
        gridBox.insertAdjacentHTML('beforeend', htmlKotak);
    }
}

function pemicuPilihFoto() {
    document.getElementById('fileFotoInput').click();
}

function prosesKonversiFoto(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        if(file.size > 5 * 1024 * 1024) { 
            tuntasAlert("Ukuran Kebesaran", "Ukuran foto terlalu besar, maksimal batasnya 5 MB ya, bro!", "error");
            return;
        }

        showLoading();
        const reader = new FileReader();
        reader.onload = async function(e) {
            const base64Data = e.target.result;
            const uploadUrl = `${SCRIPT_URL}?action=updateProfilWarga&hp=${sessionHpRaw}&filename=${encodeURIComponent(file.name)}&mimetype=${encodeURIComponent(file.type)}`;
            
            try {
                let res = await fetch(uploadUrl, {
                    method: "POST",
                    body: base64Data
                });
                let json = await res.json();
                
                if (json.status === "success") {
                    pasangFotoProfilUI(json.newFotoUrl);
                    tuntasAlert("Berhasil", "Foto profil berhasil diunggah ke server!");
                } else {
                    tuntasAlert("Gagal", "Gagal menyimpan foto: " + json.message, "error");
                }
            } catch(err) {
                tuntasAlert("Error", "Masalah jaringan atau script mengalami limitasi waktu.", "error");
            } finally {
                hideLoading();
            }
        };
        reader.readAsDataURL(file);
    }
}

async function simpanSandiBaruSheets() {
    const passBaru = document.getElementById('newPass').value.trim();
    
    if(!passBaru || passBaru.length < 3) {
        return tuntasAlert("Input Lemah", "Password baru minimal harus 3 karakter, bro!", "error");
    }

    showLoading();
    try {
        let res = await fetch(`${SCRIPT_URL}?action=updateProfilWarga&hp=${sessionHpRaw}&passwordBaru=${encodeURIComponent(passBaru)}`, {
            method: "POST"
        });
        let json = await res.json();
        
        if (json.status === "success") {
            document.getElementById('newPass').value = "";
            tuntasAlert("Sukses", "Kata sandi akun Anda berhasil diperbarui!");
        } else {
            tuntasAlert("Gagal", "Gagal mengubah password pada database.", "error");
        }
    } catch(err) {
        tuntasAlert("Error", "Gagal mengirim permintaan perubahan sandi.", "error");
    } finally {
        hideLoading();
    }
}

function kirimKonfirmasiWA() {
    const noAdmin = "6285163233482"; 
    const teksPesan = encodeURIComponent(`Halo Admin TUNTAS,\n\nSaya ingin konfirmasi bahwa saya telah melakukan pembayaran via transfer bank.\n\nNama Warga: ${sessionWarga || '-'}\nNo. HP: ${sessionHpRaw || '-'}\n\nBerikut saya lampirkan bukti transfernya. Terima kasih.`);
    window.open(`https://wa.me/${noAdmin}?text=${teksPesan}`, '_blank');
}

function bukaPopUpDetailSampah(hari, status, waktu) {
    const title = document.getElementById('popTglJudul');
    const txtStatus = document.getElementById('popStatusTeks');
    const txtJam = document.getElementById('popJamWaktu');
    const boxIcon = document.getElementById('popBoxIcon');

    title.innerText = `Laporan Tanggal ${hari}`;
    txtStatus.innerText = status === "Belum Ada" ? "BELUM ADA DATA" : status.toUpperCase();

    if (status === "Diambil") {
        txtStatus.className = "text-base font-black text-emerald-600 tracking-tight mt-1";
        txtJam.innerText = `Sampah rumah Anda telah diangkut oleh petugas pada jam ${waktu} WIB.`;
        boxIcon.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-600 shadow-xs";
    } else if (status === "Tidak Diambil") {
        txtStatus.className = "text-base font-black text-rose-500 tracking-tight mt-1";
        txtJam.innerText = `Petugas melewati atau menandai tempat Anda lewat / tidak dapat diakses oleh armada sampah.`;
        boxIcon.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-red-50 text-red-500 shadow-xs";
    } else if (status === "Kosong") {
        txtStatus.className = "text-base font-black text-slate-500 tracking-tight mt-1";
        txtJam.innerText = `Petugas memantau lokasi, namun tong / kantong sampah rumah Anda kosong.`;
        boxIcon.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-slate-100 text-slate-500 shadow-xs";
    } else {
        txtStatus.className = "text-base font-black text-slate-400 tracking-tight mt-1";
        txtJam.innerText = `Belum ada riwayat aktivitas operasional dari pengurus di tanggal ini.`;
        boxIcon.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-slate-50 text-slate-300";
    }
    openModal('mDetailSampah');
}

// TOGGLE MATA PASSWORD FORM LOGIN/BARU
function togglePasswordLogin(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (input.type === "password") {
        input.type = "text";
        icon.className = "fa-solid fa-eye text-sm";
    } else {
        input.type = "password";
        icon.className = "fa-solid fa-eye-slash text-sm";
    }
}

// ENGINE PERPINDAHAN TAB NAVIGATION BAWAH
function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active-tab'));
    document.getElementById(tabId).classList.add('active-tab');
    
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active-tab-btn'));
    btn.classList.add('active-tab-btn');
}

// SALIN NO REK BCA
function salinRekening() {
    const noRek = document.getElementById('noRekText').innerText;
    navigator.clipboard.writeText(noRek).then(() => {
        tuntasAlert("Berhasil", "Nomor rekening BCA berhasil disalin ke clipboard!");
    });
}

// LOGOUT SYSTEM
function logoutWarga() {
    sessionWarga = null;
    sessionHpRaw = null;
    document.getElementById('lHp').value = "";
    document.getElementById('screen-dashboard').classList.add('hidden');
    document.getElementById('screen-login').classList.remove('hidden');
}
