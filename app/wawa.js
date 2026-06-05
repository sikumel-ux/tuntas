// KONEKSI UTAMA API GOOGLE APPS SCRIPT & STORAGE
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw2O7sydQVyXZZhrsqAMhTABZkFYkL2x5L2x2exlc71Y6Qm-NPiUXYsSKzTsLVR_IJIRQ/exec";
const DRIVE_FOLDER_ID = "1FNIuGWMADgYO2Kk-KLmemSKmDzu46LM1";

// STATE DATABASE LOCAL APLIKASI
window.dbTuntas = { kas: [], pembayaran: [], anggota: [], sampah: [] };
window.sessionWarga = null;

const currentYear = new Date().getFullYear();
const labelBln = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

// CEK SESSION SAAT APLIKASI DIBUKA
document.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem("tuntasWargaSession");
    if (saved) {
        window.sessionWarga = JSON.parse(saved);
        document.getElementById("screen-login").classList.add("hidden");
        document.getElementById("screen-dashboard").classList.remove("hidden");
        muatDataWargaDariServer();
    }
});

// FORMATTER HELPER 1: Mengubah Tanggal ISO/Mentah ke DD-MM-YY
function formatTanggalIndo(tglStr) {
    if (!tglStr) return "-";
    try {
        const d = new Date(tglStr);
        if (isNaN(d.getTime())) {
            // Fallback manual jika format string YYYY-MM-DD
            const porsi = tglStr.split(/[-/T ]/);
            if(porsi.length >= 3) {
                const y = porsi[0].slice(-2);
                const m = String(porsi[1]).padStart(2, '0');
                const t = String(porsi[2]).padStart(2, '0');
                return `${t}-${m}-${y}`;
            }
            return tglStr;
        }
        const tgl = String(d.getDate()).padStart(2, '0');
        const bln = String(d.getMonth() + 1).padStart(2, '0');
        const thn = String(d.getFullYear()).slice(-2); 
        return `${tgl}-${bln}-${thn}`;
    } catch (e) {
        return tglStr;
    }
}

// FORMATTER HELPER 2: Mengubah Jam ke HH:MM WIB
function formatJamWib(waktuStr) {
    if (!waktuStr || waktuStr === "--:--" || waktuStr === "-") return "Belum ada jam";
    
    if (waktuStr.includes('T')) {
        const d = new Date(waktuStr);
        if (!isNaN(d.getTime())) {
            const jam = String(d.getHours()).padStart(2, '0');
            const mnt = String(d.getMinutes()).padStart(2, '0');
            return `${jam}:${mnt} WIB`;
        }
    }
    
    const porsi = waktuStr.split(':');
    if (porsi.length >= 2) {
        const jam = porsi[0].trim().padStart(2, '0');
        const mnt = porsi[1].trim().padStart(2, '0');
        return `${jam}:${mnt} WIB`;
    }
    
    return `${waktuStr} WIB`;
}

// FORMATTER HELPER 3: Format Angka ke Rupiah Standar Indonesia
function formatRupiah(n) { 
    return "Rp " + parseFloat(n || 0).toLocaleString("id-ID"); 
}

// LOGIKA PROSES LOGIN WARGA
async function prosesLoginWarga() {
    const inputHp = document.getElementById("lHp").value.trim();
    const inputPass = document.getElementById("lPass").value.trim();

    if (!inputHp || !inputPass) {
        tuntasAlert("Gagal Masuk", "Nomor Whatsapp dan Kata Sandi wajib diisi!");
        return;
    }

    showLoading(true);
    try {
        const res = await fetch(`${SCRIPT_URL}?action=readAllData`);
        const hasil = await res.json();
        
        if (hasil.status === "success" || hasil.kas) {
            const dataMurni = hasil.data ? hasil.data : hasil;
            
            window.dbTuntas.kas = dataMurni.kas || dataMurni.Kas || [];
            window.dbTuntas.pembayaran = dataMurni.pembayaran || dataMurni.Pembayaran || [];
            window.dbTuntas.anggota = dataMurni.anggota || dataMurni.Anggota || [];
            window.dbTuntas.sampah = dataMurni.sampah || dataMurni.Sampah || [];

            let formatInput = inputHp.replace(/\D/g, "");
            if (formatInput.startsWith("0")) formatInput = "62" + formatInput.substring(1);
            if (formatInput.startsWith("8")) formatInput = "62" + formatInput;

            const warga = window.dbTuntas.anggota.find(w => {
                let numDb = (w.Hp || w.hp || w.NoHP || "").toString().replace(/\D/g, "");
                if (numDb.startsWith("0")) numDb = "62" + numDb.substring(1);
                if (numDb.startsWith("8")) numDb = "62" + numDb;
                return numDb === formatInput;
            });

            if (!warga) {
                tuntasAlert("Akses Ditolak", "Nomor Whatsapp tidak terdaftar dalam sistem RT 04.");
                return;
            }

            const passDb = (warga.Password || warga.password || warga.Sandi || "").toString().trim();
            if (passDb !== inputPass) {
                tuntasAlert("Akses Ditolak", "Kata sandi yang Anda masukkan salah.");
                return;
            }

            window.sessionWarga = {
                Nama: warga.Nama || warga.nama,
                Hp: warga.Hp || warga.hp || formatInput,
                Password: passDb,
                Foto: warga.Foto || warga.foto || "",
                Bergabung: formatTanggalIndo(warga.Bergabung || warga.bergabung || "")
            };

            localStorage.setItem("tuntasWargaSession", JSON.stringify(window.sessionWarga));
            
            document.getElementById("screen-login").classList.add("hidden");
            document.getElementById("screen-dashboard").classList.remove("hidden");
            
            renderSemuaHalamanWarga();
        } else {
            throw new Error("Format API Kosong");
        }
    } catch (err) {
        console.error(err);
        tuntasAlert("Error Jaringan", "Gagal sinkronisasi data. Cek koneksi internet atau status Apps Script.");
    } finally {
        showLoading(false);
    }
}

// AMBIL DATA DARI SERVER (REFRESH/SYNC DATA)
async function muatDataWargaDariServer() {
    showLoading(true);
    try {
        const res = await fetch(`${SCRIPT_URL}?action=readAllData`);
        const hasil = await res.json();
        
        const dataMurni = hasil.data ? hasil.data : hasil;
        window.dbTuntas.kas = dataMurni.kas || dataMurni.Kas || [];
        window.dbTuntas.pembayaran = dataMurni.pembayaran || dataMurni.Pembayaran || [];
        window.dbTuntas.anggota = dataMurni.anggota || dataMurni.Anggota || [];
        window.dbTuntas.sampah = dataMurni.sampah || dataMurni.Sampah || [];

        const syncUser = window.dbTuntas.anggota.find(w => (w.Nama || w.nama || "").toLowerCase().trim() === window.sessionWarga.Nama.toLowerCase().trim());
        if (syncUser) {
            window.sessionWarga.Foto = syncUser.Foto || syncUser.foto || "";
            window.sessionWarga.Password = syncUser.Password || syncUser.password || syncUser.Sandi || "";
            window.sessionWarga.Bergabung = formatTanggalIndo(syncUser.Bergabung || syncUser.bergabung || "");
            localStorage.setItem("tuntasWargaSession", JSON.stringify(window.sessionWarga));
        }
        renderSemuaHalamanWarga();
    } catch (e) {
        console.error("Gagal sinkronisasi data server:", e);
    } finally {
        showLoading(false);
    }
}

// KELOLA PILIHAN OPSI BULAN KAS DI DASHBOARD
function inisialisasiFilterBulan() {
    const sel = document.getElementById("filterBulanKas");
    if (!sel) return;
    sel.innerHTML = "";
    const mSekarang = new Date().getMonth();
    labelBln.forEach((b, index) => {
        const opt = document.createElement("option");
        opt.value = index;
        opt.innerText = b.substring(0,3) + " " + currentYear;
        if(index === mSekarang) opt.selected = true;
        sel.appendChild(opt);
    });
}

// UTAMA: RENDER DATA KE ELEMENT HTML UI
function renderSemuaHalamanWarga() {
    if (!window.sessionWarga) return;

    // Set Header & Data Profile Warga Aktif
    document.getElementById("topNamaWarga").innerText = window.sessionWarga.Nama.toUpperCase();
    document.getElementById("topHpWarga").innerText = window.sessionWarga.Hp;
    document.getElementById("infoNamaUser").innerText = window.sessionWarga.Nama.toUpperCase();
    document.getElementById("infoHpUser").innerText = window.sessionWarga.Hp;
    document.getElementById("infoGabungUser").innerText = window.sessionWarga.Bergabung || '-';

    // Hitung Akumulasi Total Saldo Kas Komunitas Komulatif
    let masuk = 0; let keluar = 0;
    (window.dbTuntas.kas || []).forEach(k => {
        const n = parseFloat(k.Nominal || k.nominal || 0);
        if ((k.Kategori || k.kategori || "").toLowerCase() === 'masuk') masuk += n; else keluar += n;
    });
    document.getElementById("dashPemasukanKas").innerText = formatRupiah(masuk);
    document.getElementById("dashPengeluaranKas").innerText = formatRupiah(keluar);
    document.getElementById("dashSisaSaldoKas").innerText = formatRupiah(masuk - keluar);

    if(document.getElementById("filterBulanKas").children.length === 0) {
        inisialisasiFilterBulan();
    }
    renderHistoriKasSebulan();

    // Olah Kontribusi Finansial Mandiri (Warga Terkait)
    const iuranSaya = (window.dbTuntas.pembayaran || []).filter(p => (p.Nama || p.nama || "").toLowerCase().trim() === window.sessionWarga.Nama.toLowerCase().trim());
    
    let totalKontribusiPribadi = 0;
    iuranSaya.forEach(p => totalKontribusiPribadi += parseFloat(p.Nominal || p.nominal || 0));
    document.getElementById("dataTotalKontribusi").innerText = formatRupiah(totalKontribusiPribadi);

    // Render Status Grid Iuran Bulanan 12 Bulan (Lunas/Belum)
    const gridBulan = document.getElementById("statusBulanGrid");
    gridBulan.innerHTML = "";
    labelBln.forEach(b => {
        const lunas = iuranSaya.some(p => (p.Keterangan || p.keterangan || "").includes(b));
        gridBulan.innerHTML += `
            <div class="p-3 rounded-xl text-center border ${lunas ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-300'} flex flex-col justify-center">
                <span class="text-[10px] font-black uppercase leading-none">${b.substring(0,3)}</span>
                <span class="text-[7px] font-bold mt-1 tracking-tighter">${lunas ? 'LUNAS' : 'BELUM'}</span>
            </div>`;
    });

    // Render Log List Riwayat Pembayaran Pribadi
    const listHistoriIuran = document.getElementById("listRiwayatPribadi");
    listHistoriIuran.innerHTML = "";
    if(iuranSaya.length === 0) {
        listHistoriIuran.innerHTML = `<p class="text-center text-[10px] text-slate-400 py-2 font-semibold">Belum ada histori pembayaran.</p>`;
    } else {
        [...iuranSaya].reverse().forEach(p => {
            const tanggalNormal = formatTanggalIndo(p.Tanggal || p.tanggal);
            listHistoriIuran.innerHTML += `
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                    <div>
                        <p class="font-black text-slate-700 uppercase">${p.Keterangan || p.keterangan || 'IURAN KAS'}</p>
                        <p class="text-[9px] text-slate-400">Tanggal: ${tanggalNormal}</p>
                    </div>
                    <span class="font-black text-slate-800">${formatRupiah(p.Nominal || p.nominal)}</span>
                </div>`;
        });
    }

    // Set Judul Kalender Sampah Bulanan Berjalan
    const tgl = new Date();
    document.getElementById('judulKalenderSampah').innerText = `Kalender Sampah (${labelBln[tgl.getMonth()]} ${tgl.getFullYear()})`;
    renderKalenderSampah();

    // Render Tampilan Avatar Gambar Profil
    const img = document.getElementById("avatarImage");
    const defIcon = document.getElementById("avatarIconDefault");
    if (window.sessionWarga.Foto && window.sessionWarga.Foto !== "-" && window.sessionWarga.Foto.trim() !== "") {
        img.src = window.sessionWarga.Foto;
        img.classList.remove("hidden");
        defIcon.classList.add("hidden");
    } else {
        img.classList.add("hidden");
        defIcon.classList.remove("hidden");
    }
}

// LOGIKA FILTER MUTASI LOG KAS KOMUNITAS BULANAN
function renderHistoriKasSebulan() {
    const filterIdx = parseInt(document.getElementById("filterBulanKas").value);
    const containerMutasi = document.getElementById("listMutasiKasDashboard");
    containerMutasi.innerHTML = "";

    const dataKasFiltered = (window.dbTuntas.kas || []).filter(k => {
        let tglStr = k.Tanggal || k.tanggal;
        if(!tglStr) return false;
        
        const d = new Date(tglStr);
        let blnKas = d.getMonth();
        if(isNaN(blnKas)) {
            let porsi = tglStr.split(/[-/T ]/);
            blnKas = parseInt(porsi[1]) - 1;
        }
        return blnKas === filterIdx;
    });

    if(dataKasFiltered.length === 0) {
        containerMutasi.innerHTML = `<p class="text-center text-[10px] text-slate-400 py-6 font-semibold uppercase">Tidak ada transaksi kas bulan ini.</p>`;
    } else {
        [...dataKasFiltered].reverse().forEach(k => {
            const isMasuk = (k.Kategori || k.kategori || "").toLowerCase() === 'masuk';
            const tanggalNormal = formatTanggalIndo(k.Tanggal || k.tanggal);
            
            containerMutasi.innerHTML += `
                <div class="py-2.5 flex justify-between items-center text-xs border-b border-slate-50 last:border-none">
                    <div>
                        <p class="font-black text-slate-700 uppercase">${k.Keterangan || k.keterangan}</p>
                        <p class="text-[9px] text-slate-400">${tanggalNormal}</p>
                    </div>
                    <span class="font-black ${isMasuk ? 'text-emerald-600' : 'text-rose-500'}">
                        ${isMasuk ? '+' : '-'} ${formatRupiah(k.Nominal || k.nominal)}
                    </span>
                </div>`;
        });
    }
}

// RENDERING SYSTEM GRID UTAMA KALENDER SAMPAH
function renderKalenderSampah() {
    const grid = document.getElementById("gridAngkaKalender");
    if (!grid) return;
    grid.innerHTML = "";
    
    const tgl = new Date();
    const jmlHari = new Date(tgl.getFullYear(), tgl.getMonth() + 1, 0).getDate();
    const sampahSaya = (window.dbTuntas.sampah || []).filter(s => (s.Nama || s.nama || "").toLowerCase().trim() === window.sessionWarga.Nama.toLowerCase().trim());

    for (let hari = 1; hari <= jmlHari; hari++) {
        const tglTargetStr = `${tgl.getFullYear()}-${String(tgl.getMonth()+1).padStart(2,'0')}-${String(hari).padStart(2,'0')}`;
        
        const log = sampahSaya.find(s => {
            const tglDb = s.Tanggal || s.tanggal || "";
            return tglDb.includes(tglTargetStr) || parseInt(s.Hari || s.hari) === hari;
        });
        
        let bgStyle = "bg-slate-100 text-slate-400 border border-slate-200/40";
        let status = "Belum Ada";
        let waktu = "--:--";
        let subTeks = "";
        
        if (log) {
            status = log.Status || log.status || "Kosong";
            waktu = formatJamWib(log.Waktu || log.waktu);
            
            if (status.toLowerCase() === "diambil") {
                bgStyle = "bg-emerald-500 text-white shadow-xs";
                subTeks = `<span class="block text-[7px] font-black mt-0.5 opacity-90">${waktu.replace(" WIB","")}</span>`;
            } else if (status.toLowerCase() === "tidak diambil" || status.toLowerCase() === "lewat") {
                bgStyle = "bg-rose-500 text-white shadow-xs";
                subTeks = `<span class="block text-[7px] font-black mt-0.5 opacity-90">LEWAT</span>`;
            } else if (status.toLowerCase() === "kosong") {
                bgStyle = "bg-slate-400 text-white";
                subTeks = `<span class="block text-[7px] font-black mt-0.5 opacity-80">KOSONG</span>`;
            }
        }

        grid.innerHTML += `
            <div onclick="bukaPopUpDetailSampah('${hari}', '${status}', '${waktu}')" 
                 class="p-2 py-3 rounded-xl text-center cursor-pointer active:scale-95 transition-all flex flex-col justify-center items-center h-14 ${bgStyle}">
                <span class="text-xs font-black">${hari}</span>
                ${subTeks}
            </div>`;
    }
}

// BUKA MODAL DETAIL DATA OPERASIONAL SAMPAH WARGA
function bukaPopUpDetailSampah(hari, status, waktu) {
    const title = document.getElementById('popTglJudul');
    const txtStatus = document.getElementById('popStatusTeks');
    const txtJam = document.getElementById('popJamWaktu');
    const boxIcon = document.getElementById('popBoxIcon');

    const tglSkg = new Date();
    const tglPenuhFormat = `${String(hari).padStart(2,'0')}-${String(tglSkg.getMonth()+1).padStart(2,'0')}-${String(tglSkg.getFullYear()).slice(-2)}`;

    title.innerText = `Laporan Tanggal ${tglPenuhFormat}`;
    txtStatus.innerText = status === "Belum Ada" ? "BELUM ADA DATA" : status.toUpperCase();

    if (status.toLowerCase() === "diambil") {
        txtStatus.className = "text-base font-black text-emerald-600 tracking-tight mt-1";
        txtJam.innerText = `Sampah rumah Anda telah diangkut oleh petugas pada jam ${waktu}.`;
        boxIcon.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-600 shadow-xs";
    } else if (status.toLowerCase() === "tidak diambil" || status.toLowerCase() === "lewat") {
        txtStatus.className = "text-base font-black text-rose-500 tracking-tight mt-1";
        txtJam.innerText = `Petugas melewati lokasi atau menandai area Anda tidak dapat diakses.`;
        boxIcon.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-red-50 text-red-500 shadow-xs";
    } else if (status.toLowerCase() === "kosong") {
        txtStatus.className = "text-base font-black text-slate-500 tracking-tight mt-1";
        txtJam.innerText = `Petugas memantau lokasi, namun tong sampah rumah Anda dalam keadaan kosong.`;
        boxIcon.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-slate-100 text-slate-500 shadow-xs";
    } else {
        txtStatus.className = "text-base font-black text-slate-400 tracking-tight mt-1";
        txtJam.innerText = `Belum ada riwayat laporan operasional petugas di tanggal ini.`;
        boxIcon.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-slate-50 text-slate-300";
    }

    openModal('mDetailSampah');
}

// UPDATE DATA KATA SANDI (PASSWORD) WARGA KE SERVER
async function updateSandiWarga() {
    const pass = document.getElementById("newPass").value.trim();
    if(!pass) return tuntasAlert("Input Kosong", "Masukkan kata sandi baru.");

    showLoading(true);
    try {
        const res = await fetch(`${SCRIPT_URL}?action=updatePassword&hp=${window.sessionWarga.Hp}&password=${pass}`, { method: 'POST' });
        const r = await res.json();
        if(r.status === "success") {
            tuntasAlert("Berhasil", "Kata sandi sukses diperbarui!");
            document.getElementById("newPass").value = "";
            muatDataWargaDariServer();
        }
    } catch(e) {
        tuntasAlert("Gagal", "Sistem gagal memperbarui kata sandi.");
    } finally { showLoading(false); }
}

// ACTION TRIGGER FILE UPLOAD
function pemicuUploadFoto() { 
    document.getElementById("fileFotoInput").click(); 
}

// UPLOAD FOTO PROFIL KE GOOGLE DRIVE CLOUD STORAGE
async function unggahFotoProfil(input) {
    const file = input.files[0];
    if (!file) return;

    showLoading(true);
    const r = new FileReader();
    r.readAsDataURL(file);
    r.onload = async () => {
        try {
            const res = await fetch(`${SCRIPT_URL}?action=updateProfilWarga&hp=${window.sessionWarga.Hp}`, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ 
                    image: r.result, 
                    filename: `AVATAR_${window.sessionWarga.Nama.replace(/\s+/g, '_')}_${Date.now()}`, 
                    mimeType: file.type,
                    folderId: DRIVE_FOLDER_ID
                })
            });
            const hasil = await res.json();
            if(hasil.status === "success") {
                tuntasAlert("Berhasil", "Foto profil Anda berhasil diunggah langsung ke Cloud Storage!");
                muatDataWargaDariServer();
            } else {
                throw new Error(hasil.message);
            }
        } catch(e) {
            console.error(e);
            tuntasAlert("Gagal Unggah", "Gagal menyimpan foto ke Drive Folder.");
        } finally { showLoading(false); input.value = ""; }
    };
}

// SISTEM NAVIGASI PERPINDAHAN TAB MENU DASHBOARD
function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active-tab-btn'));
    btn.classList.add('active-tab-btn');

    if(tabId === 'tab-data') {
        renderKalenderSampah();
    }
}

// SHOW/HIDE TEXT FIELD PASSWORD LOGIN
function togglePasswordLogin() {
    const p = document.getElementById('lPass');
    const icon = document.getElementById('eyeIcon');
    if(p.type === 'password') { p.type = 'text'; icon.className = "fa-solid fa-eye text-sm"; } 
    else { p.type = 'password'; icon.className = "fa-solid fa-eye-slash text-sm"; }
}

// COPY REKENING TRANSFERS KE CLIPBOARD
function salinRekening() {
    navigator.clipboard.writeText(document.getElementById('noRekText').innerText);
    tuntasAlert("Tersalin", "Nomor rekening berhasil disalin ke clipboard.");
}

// HUBUNGKAN BUKTI KONFIRMASI PEMBAYARAN KAS KE WHATSAPP ADMIN BENDHAHARA
function kirimKonfirmasiWA() {
    window.open(`https://wa.me/6281234567890?text=${encodeURIComponent("Halo Pengurus TUNTAS RT 04 Dongkelan, saya ingin konfirmasi pembayaran iuran kas bulanan warga.")}`, "_blank");
}

// OVERLAY UTILITY FRAMEWORK (LOADING & ALERTS MODAL)
function tuntasAlert(title, message) {
    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMsg').innerText = message;
    openModal('customAlert');
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function closeAlert() { document.getElementById('customAlert').style.display = 'none'; }
function showLoading(st) { document.getElementById("loading").style.display = st ? 'flex' : 'none'; }
function logoutWarga() { localStorage.removeItem("tuntasWargaSession"); location.reload(); }
