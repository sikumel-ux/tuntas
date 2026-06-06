// ==========================================================================
// TUNTAS - Premium Minimalist Frontend Engine (Figma Style) - USER SIDE
// VERSION 2.5 - FIX UPLOAD FOTO MANDIRI (JSON PAYLOAD ENGINE)
// ==========================================================================

// KONEKSI UTAMA API GOOGLE APPS SCRIPT
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwHI6Gf_GG2ssP45vPx1VRHriMsGmeyEVZXNuj8Z0p70kUFhYNkexlG3l0_LCCvCyA/exec";

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

// --- FORMATTER HELPERS ---
function formatTanggalIndo(tglStr) {
    if (!tglStr) return "-";
    try {
        const d = new Date(tglStr);
        if (isNaN(d.getTime())) {
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

function formatJamWib(waktuStr) {
    if (!waktuStr || waktuStr === "--:--" || waktuStr === "-") return "Belum ada jam";
    if (waktuStr.includes('T')) {
        const d = new Date(waktuStr);
        if (!isNaN(d.getTime())) {
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} WIB`;
        }
    }
    const porsi = waktuStr.split(':');
    if (porsi.length >= 2) {
        return `${porsi[0].trim().padStart(2, '0')}:${porsi[1].trim().padStart(2, '0')} WIB`;
    }
    return `${waktuStr} WIB`;
}

function formatRupiah(n) { 
    return "Rp " + parseFloat(n || 0).toLocaleString("id-ID"); 
}

// --- LOGIKA LOGIN WARGA ---
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
        
        if (hasil.status === "success" || hasil.data) {
            const dataMurni = hasil.data ? hasil.data : hasil;
            
            window.dbTuntas.kas = dataMurni.kas || [];
            window.dbTuntas.pembayaran = dataMurni.pembayaran || [];
            window.dbTuntas.anggota = dataMurni.anggota || [];
            window.dbTuntas.sampah = dataMurni.sampah || [];

            let formatInput = inputHp.replace(/\D/g, "");
            if (formatInput.startsWith("0")) formatInput = "62" + formatInput.substring(1);
            if (formatInput.startsWith("8")) formatInput = "62" + formatInput;

            const warga = window.dbTuntas.anggota.find(w => {
                let numDb = (w.Hp || "").toString().replace(/\D/g, "");
                if (numDb.startsWith("0")) numDb = "62" + numDb.substring(1);
                if (numDb.startsWith("8")) numDb = "62" + numDb;
                return numDb === formatInput;
            });

            if (!warga) {
                tuntasAlert("Akses Ditolak", "Nomor Whatsapp tidak terdaftar dalam sistem RT 04.");
                return;
            }

            const passDb = (warga.Password || warga.sandi || "").toString().trim();
            if (passDb !== inputPass) {
                tuntasAlert("Akses Ditolak", "Kata sandi yang Anda masukkan salah.");
                return;
            }

            window.sessionWarga = {
                Nama: warga.Nama,
                Hp: warga.Hp || formatInput,
                Password: passDb,
                Foto: warga.Foto || "",
                Bergabung: formatTanggalIndo(warga.Bergabung || "")
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
        tuntasAlert("Error Jaringan", "Gagal sinkronisasi data. Cek status Apps Script.");
    } finally {
        showLoading(false);
    }
}

// --- SYNC / REFRESH DATA ---
async function muatDataWargaDariServer() {
    showLoading(true);
    try {
        const res = await fetch(`${SCRIPT_URL}?action=readAllData`);
        const hasil = await res.json();
        
        const dataMurni = hasil.data ? hasil.data : hasil;
        window.dbTuntas.kas = dataMurni.kas || [];
        window.dbTuntas.pembayaran = dataMurni.pembayaran || [];
        window.dbTuntas.anggota = dataMurni.anggota || [];
        window.dbTuntas.sampah = dataMurni.sampah || [];

        const syncUser = window.dbTuntas.anggota.find(w => (w.Nama || "").toLowerCase().trim() === window.sessionWarga.Nama.toLowerCase().trim());
        if (syncUser) {
            window.sessionWarga.Foto = syncUser.Foto || "";
            window.sessionWarga.Password = syncUser.Password || "";
            window.sessionWarga.Bergabung = formatTanggalIndo(syncUser.Bergabung || "");
            localStorage.setItem("tuntasWargaSession", JSON.stringify(window.sessionWarga));
        }
        renderSemuaHalamanWarga();
    } catch (e) {
        console.error("Gagal sinkronisasi data server:", e);
    } finally {
        showLoading(false);
    }
}

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

// --- UTAMA: RENDER UI DATA WARGA ---
function renderSemuaHalamanWarga() {
    if (!window.sessionWarga) return;

    // Set Header & Data Profile
    document.getElementById("topNamaWarga").innerText = window.sessionWarga.Nama.toUpperCase();
    document.getElementById("topHpWarga").innerText = window.sessionWarga.Hp;
    document.getElementById("infoNamaUser").innerText = window.sessionWarga.Nama.toUpperCase();
    document.getElementById("infoHpUser").innerText = window.sessionWarga.Hp;
    document.getElementById("infoGabungUser").innerText = window.sessionWarga.Bergabung || '-';

    // Hitung Saldo Kas Komunitas
    let masuk = 0; let keluar = 0;
    (window.dbTuntas.kas || []).forEach(k => {
        const n = parseFloat(k.Nominal || 0);
        if ((k.Kategori || "").toLowerCase() === 'masuk') masuk += n; else keluar += n;
    });
    document.getElementById("dashPemasukanKas").innerText = formatRupiah(masuk);
    document.getElementById("dashPengeluaranKas").innerText = formatRupiah(keluar);
    document.getElementById("dashSisaSaldoKas").innerText = formatRupiah(masuk - keluar);

    if(document.getElementById("filterBulanKas").children.length === 0) {
        inisialisasiFilterBulan();
    }
    renderHistoriKasSebulan();

    // Olah Kontribusi Pribadi
    const iuranSaya = (window.dbTuntas.pembayaran || []).filter(p => (p.Nama || "").toLowerCase().trim() === window.sessionWarga.Nama.toLowerCase().trim());
    
    let totalKontribusiPribadi = 0;
    iuranSaya.forEach(p => totalKontribusiPribadi += parseFloat(p.Nominal || 0));
    document.getElementById("dataTotalKontribusi").innerText = formatRupiah(totalKontribusiPribadi);

    // Grid Status Bulanan
    const gridBulan = document.getElementById("statusBulanGrid");
    gridBulan.innerHTML = "";
    labelBln.forEach(b => {
        const lunas = iuranSaya.some(p => (p.Keterangan || "").includes(b));
        gridBulan.innerHTML += `
            <div class="p-3 rounded-xl text-center border ${lunas ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-300'} flex flex-col justify-center">
                <span class="text-[10px] font-black uppercase leading-none">${b.substring(0,3)}</span>
                <span class="text-[7px] font-bold mt-1 tracking-tighter">${lunas ? 'LUNAS' : 'BELUM'}</span>
            </div>`;
    });

    // List Riwayat Pembayaran Pribadi
    const listHistoriIuran = document.getElementById("listRiwayatPribadi");
    listHistoriIuran.innerHTML = "";
    if(iuranSaya.length === 0) {
        listHistoriIuran.innerHTML = `<p class="text-center text-[10px] text-slate-400 py-2 font-semibold">Belum ada histori pembayaran.</p>`;
    } else {
        [...iuranSaya].reverse().forEach(p => {
            listHistoriIuran.innerHTML += `
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                    <div>
                        <p class="font-black text-slate-700 uppercase">${p.Keterangan || 'IURAN KAS'}</p>
                        <p class="text-[9px] text-slate-400">Tanggal: ${formatTanggalIndo(p.Tanggal)}</p>
                    </div>
                    <span class="font-black text-slate-800">${formatRupiah(p.Nominal)}</span>
                </div>`;
        });
    }

    // Kalender Sampah
    const tgl = new Date();
    document.getElementById('judulKalenderSampah').innerText = `Kalender Sampah (${labelBln[tgl.getMonth()]} ${tgl.getFullYear()})`;
    renderKalenderSampah();

    // Avatar Render
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

function renderHistoriKasSebulan() {
    const filterIdx = parseInt(document.getElementById("filterBulanKas").value);
    const containerMutasi = document.getElementById("listMutasiKasDashboard");
    containerMutasi.innerHTML = "";

    const dataKasFiltered = (window.dbTuntas.kas || []).filter(k => {
        let tglStr = k.Tanggal;
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
            const isMasuk = (k.Kategori || "").toLowerCase() === 'masuk';
            containerMutasi.innerHTML += `
                <div class="py-2.5 flex justify-between items-center text-xs border-b border-slate-50 last:border-none">
                    <div>
                        <p class="font-black text-slate-700 uppercase">${k.Keterangan}</p>
                        <p class="text-[9px] text-slate-400">${formatTanggalIndo(k.Tanggal)}</p>
                    </div>
                    <span class="font-black ${isMasuk ? 'text-emerald-600' : 'text-rose-500'}">
                        ${isMasuk ? '+' : '-'} ${formatRupiah(k.Nominal)}
                    </span>
                </div>`;
        });
    }
}

function renderKalenderSampah() {
    const grid = document.getElementById("gridAngkaKalender");
    if (!grid) return;
    grid.innerHTML = "";
    
    const tgl = new Date();
    const jmlHari = new Date(tgl.getFullYear(), tgl.getMonth() + 1, 0).getDate();
    const sampahSaya = (window.dbTuntas.sampah || []).filter(s => (s.Nama || "").toLowerCase().trim() === window.sessionWarga.Nama.toLowerCase().trim());

    for (let hari = 1; hari <= jmlHari; hari++) {
        const tglTargetStr = `${tgl.getFullYear()}-${String(tgl.getMonth()+1).padStart(2,'0')}-${String(hari).padStart(2,'0')}`;
        
        const log = sampahSaya.find(s => {
            const tglDb = s.Tanggal || "";
            return tglDb.includes(tglTargetStr) || parseInt(s.Hari) === hari;
        });
        
        let bgStyle = "bg-slate-100 text-slate-400 border border-slate-200/40";
        let status = "Belum Ada";
        let waktu = "--:--";
        let subTeks = "";
        
        if (log) {
            status = log.Status || "Kosong";
            waktu = formatJamWib(log.Waktu || log.waktu || "-");
            
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

// --- UPDATE PASSWORD MANDIRI ---
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

function pemicuUploadFoto() { 
    document.getElementById("fileFotoInput").click(); 
}

// HELPER CANVAS COMPRESSION
function kompresiFotoWarga(file, maxWidth = 800, quality = 0.75) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let w = img.width;
                let h = img.height;
                if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL("image/jpeg", quality));
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

// --- UPLOAD FOTO PROFIL (FIXED JSON ENGINE) ---
async function unggahFotoProfil(input) {
    const file = input.files[0];
    if (!file) return;

    showLoading(true);
    try {
        // Kompresi gambar via canvas agar ukurannya bersahabat dengan payload text/plain
        const base64Kompresi = await kompresiFotoWarga(file);

        // Bungkus data ke format JSON murni
        const payload = { 
            image: base64Kompresi, 
            filename: `AVATAR_${window.sessionWarga.Nama.replace(/\s+/g, '_')}_${Date.now()}.jpg`, 
            mimeType: "image/jpeg",
            folderId: "1FNIuGWMADgYO2Kk-KLmemSKmDzu46LM1" // Harus sama dengan DRIVE_FOLDER_ID di backend
        };

        const res = await fetch(`${SCRIPT_URL}?action=updateProfilWarga&hp=${window.sessionWarga.Hp}`, {
            method: 'POST',
            headers: { "Content-Type": "text/plain;charset=utf-8" }, // Amandemen bypass preflight CORS
            body: JSON.stringify(payload)
        });
        
        const hasil = await res.json();
        if(hasil.status === "success") {
            tuntasAlert("Berhasil", "Foto profil Anda berhasil diperbarui!");
            muatDataWargaDariServer();
        } else {
            throw new Error(hasil.message || "Gagal menyimpan di server.");
        }
    } catch(e) {
        console.error("Detail Error Upload:", e);
        tuntasAlert("Gagal Unggah", "Gagal menyimpan foto ke Drive Folder.");
    } finally { 
        showLoading(false); 
        input.value = ""; 
    }
}

// --- NAVIGATION & UTILITIES ---
function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active-tab-btn'));
    btn.classList.add('active-tab-btn');

    if(tabId === 'tab-data') {
        renderKalenderSampah();
    }
}

function togglePasswordLogin() {
    const p = document.getElementById('lPass');
    const icon = document.getElementById('eyeIcon');
    if(p.type === 'password') { p.type = 'text'; icon.className = "fa-solid fa-eye text-sm"; } 
    else { p.type = 'password'; icon.className = "fa-solid fa-eye-slash text-sm"; }
}

function salinRekening() {
    navigator.clipboard.writeText(document.getElementById('noRekText').innerText);
    tuntasAlert("Tersalin", "Nomor rekening berhasil disalin.");
}

function kirimKonfirmasiWA() {
    window.open("https://wa.me/6281234567890?text=" + encodeURIComponent("Halo Pengurus TUNTAS RT 04 Dongkelan, saya ingin konfirmasi pembayaran iuran kas bulanan."), "_blank");
}

function tuntasAlert(title, message) {
    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMsg').innerText = message;
    openModal('customAlert');
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
// Memperbaiki modal penutup customAlert agar tidak crash saat logout/refresh
function closeModal(id) { 
    const el = document.getElementById(id);
    if (el) el.style.display = 'none'; 
}
function closeAlert() { document.getElementById('customAlert').style.display = 'none'; }
function showLoading(st) { document.getElementById("loading").style.display = st ? 'flex' : 'none'; }
function logoutWarga() { localStorage.removeItem("tuntasWargaSession"); location.reload(); }
