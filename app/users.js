/**
 * TUNTAS FRONTEND ENGINE - ANGGOTA CORE (anggota.js)
 */

// URL GAS Baru Andalanmu yang 100% Valid & Terkunci Mati, Bro!
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw2O7sydQVyXZZhrsqAMhTABZkFYkL2x5L2x2exlc71Y6Qm-NPiUXYsSKzTsLVR_IJIRQ/exec";

// Tempat menyimpan data global hasil fetch dari server
window.dbTuntas = {
    anggota: [],
    kas: [],
    pembayaran: [],
    sampah: []
};

// Data session warga aktif yang sedang login
window.sessionWarga = null;

/**
 * 1. INISIALISASI SAAT HALAMAN DI-LOAD
 */
document.addEventListener("DOMContentLoaded", () => {
    // Cek apakah ada session login tersimpan di localStorage
    const savedSession = localStorage.getItem("tuntasWargaSession");
    if (savedSession) {
        window.sessionWarga = JSON.parse(savedSession);
        // Sembunyikan login, tampilkan dashboard utama
        document.getElementById("screen-login").classList.add("hidden");
        document.getElementById("screen-dashboard").classList.remove("hidden");
        // Tarik data segar dari server
        muatSemuaDataServer();
    } else {
        // Tetap di layar login, pastikan loading overlay mati saat awal buka
        showLoading(false);
    }
});

/**
 * 2. PROSES LOGIN WARGA (VALIDASI TELEPON & KATA SANDI)
 */
async function prosesLoginWarga() {
    const inputHp = document.getElementById("lHp").value.trim();
    const inputPass = document.getElementById("lPass").value.trim();

    if (!inputHp || !inputPass) {
        openAlert("error", "Gagal Masuk", "Nomor Whatsapp dan Kata Sandi wajib diisi!");
        return;
    }

    showLoading(true);
    try {
        // Ambil data anggota terbaru dari server untuk dicocokkan
        const respon = await fetch(`${SCRIPT_URL}?action=readAllData`);
        if (!respon.ok) throw new Error("Gagal terhubung ke jaringan server.");

        const hasil = await respon.json();
        if (hasil.status === "success") {
            window.dbTuntas = hasil.data;

            // Cari warga berdasarkan kecocokan Nomor HP (abaikan spasi/format string)
            const wargaDitemukan = window.dbTuntas.anggota.find(w => {
                const hpDatabase = w.HP.toString().trim();
                return hpDatabase === inputHp || hpDatabase === "62" + inputHp || hpDatabase === inputHp.replace(/^0/, "62");
            });

            if (!wargaDitemukan) {
                openAlert("error", "Akses Ditolak", "Nomor Whatsapp tidak terdaftar di warga RT 04.");
                showLoading(false);
                return;
            }

            // Validasi kata sandi (Default di database adalah kolom 'Sandi' atau 'Password')
            const sandiDatabase = (wargaDitemukan.Sandi || wargaDitemukan.Password || "123").toString().trim();
            if (sandiDatabase !== inputPass) {
                openAlert("error", "Akses Ditolak", "Kata sandi yang Anda masukkan salah.");
                showLoading(false);
                return;
            }

            // Simpan ke session global & local storage jika login sukses
            window.sessionWarga = wargaDitemukan;
            localStorage.setItem("tuntasWargaSession", JSON.stringify(wargaDitemukan));

            // Transisi Layar Antarmuka
            document.getElementById("screen-login").classList.add("hidden");
            document.getElementById("screen-dashboard").classList.remove("hidden");

            // Render semua komponen dashboard
            jalankanRenderSemuaKomponen();
        } else {
            throw new Error(hasil.message);
        }
    } catch (err) {
        console.error(err);
        openAlert("error", "Server Gangguan", "Gagal memproses otentikasi login.");
    } finally {
        showLoading(false);
    }
}

/**
 * 3. RETRIEVE DATA TERBARU DARI GOOGLE SHEETS
 */
async function muatSemuaDataServer() {
    showLoading(true);
    try {
        const respon = await fetch(`${SCRIPT_URL}?action=readAllData`);
        if (!respon.ok) throw new Error("Koneksi internet bermasalah.");

        const hasil = await respon.json();
        if (hasil.status === "success") {
            window.dbTuntas = hasil.data;
            
            // Perbarui data session lokal dari database terbaru jika ada perubahan
            const dataTerbaru = window.dbTuntas.anggota.find(w => w.HP.toString().trim() === window.sessionWarga.HP.toString().trim());
            if (dataTerbaru) {
                window.sessionWarga = dataTerbaru;
                localStorage.setItem("tuntasWargaSession", JSON.stringify(dataTerbaru));
            }

            jalankanRenderSemuaKomponen();
        } else {
            throw new Error(hasil.message);
        }
    } catch (err) {
        console.error(err);
        openAlert("error", "Sinkronisasi Gagal", "Gagal memuat pembaruan data dari server.");
    } finally {
        showLoading(false);
    }
}

/**
 * 4. ROUTER UTAMA UNTUK MERENDER SELURUH ELEMEN UI
 */
function jalankanRenderSemuaKomponen() {
    if (!window.sessionWarga) return;

    // A. Render Header Identitas Atas
    document.getElementById("topNamaWarga").innerText = window.sessionWarga.Nama.toUpperCase();
    document.getElementById("topHpWarga").innerText = `+${window.sessionWarga.HP}`;
    
    const miniAvatar = document.getElementById("miniAvatar");
    if (window.sessionWarga.Foto && window.sessionWarga.Foto.trim() !== "") {
        miniAvatar.src = window.sessionWarga.Foto;
        miniAvatar.classList.remove("hidden");
    } else {
        miniAvatar.classList.add("hidden");
    }

    // B. Render Konten Tab Dashboard (Kas Utama RT)
    let totalMasuk = 0;
    let totalKeluar = 0;

    window.dbTuntas.kas.forEach(k => {
        const nom = parseFloat(k.Nominal) || 0;
        const kat = k.Kategori.toLowerCase().trim();
        if (kat === "masuk" || kat === "pemasukan") totalMasuk += nom;
        if (kat === "keluar" || kat === "pengeluaran") totalKeluar += nom;
    });

    document.getElementById("dashPemasukanKas").innerText = formatRupiah(totalMasuk);
    document.getElementById("dashPengeluaranKas").innerText = formatRupiah(totalKeluar);
    document.getElementById("dashSisaSaldoKas").innerText = formatRupiah(totalMasuk - totalKeluar);

    // Render List Mutasi Log di Dashboard
    const containerMutasi = document.getElementById("listMutasiKasDashboard");
    containerMutasi.innerHTML = "";
    
    if (window.dbTuntas.kas.length === 0) {
        containerMutasi.innerHTML = `<p class="text-center text-[11px] text-slate-400 py-4 font-semibold">Belum ada mutasi kas.</p>`;
    } else {
        // Ambil 15 transaksi kas teratas/terbaru
        window.dbTuntas.kas.slice(-15).reverse().forEach(k => {
            const isMasuk = k.Kategori.toLowerCase().trim() === "masuk" || k.Kategori.toLowerCase().trim() === "pemasukan";
            const div = document.createElement("div");
            div.className = "flex justify-between items-center py-2.5 border-b border-slate-50 text-xs";
            div.innerHTML = `
                <div>
                    <p class="font-bold text-slate-700 uppercase tracking-tight">${k.Keterangan}</p>
                    <p class="text-[9px] text-slate-400 font-semibold mt-0.5">${k.Tanggal}</p>
                </div>
                <p class="font-black ${isMasuk ? 'text-emerald-600' : 'text-rose-600'}">
                    ${isMasuk ? '+' : '-'} ${formatRupiah(k.Nominal)}
                </p>
            `;
            containerMutasi.appendChild(div);
        });
    }

    // C. Render Konten Tab Data Laporan (Iuran & Kalender Sampah)
    const containerIuranGrid = document.getElementById("statusBulanGrid");
    containerIuranGrid.innerHTML = "";
    
    const iuranSaya = window.dbTuntas.pembayaran.find(p => p.HP.toString().trim() === window.sessionWarga.HP.toString().trim());
    const listBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    let akumulasiKontribusi = 0;

    listBulan.forEach(b => {
        const status = iuranSaya && iuranSaya[b] ? iuranSaya[b].toString().toUpperCase().trim() : "BELUM BAYAR";
        const isLunas = status === "LUNAS";
        
        if (isLunas) {
            // Asumsi nilai iuran bulanan tetap Rp 20.000, silakan sesuaikan nominal aslimu di sini
            akumulasiKontribusi += 20000; 
        }

        const box = document.createElement("div");
        box.className = `p-2 rounded-xl border text-center flex flex-col justify-center items-center shadow-xs ${isLunas ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-slate-50 border-slate-100 text-slate-400'}`;
        box.innerHTML = `
            <span class="text-[9px] font-black uppercase tracking-tight">${b.substring(0, 3)}</span>
            <span class="text-[8px] font-extrabold mt-0.5">${isLunas ? 'LUNAS' : 'BLM'}</span>
        `;
        containerIuranGrid.appendChild(box);
    });

    document.getElementById("dataTotalKontribusi").innerText = formatRupiah(akumulasiKontribusi);

    // Render Kalender Jadwal Sampah Interaktif
    renderKalenderSampahWarga();

    // D. Render Konten Tab Informasi (Profil Menu Settings)
    document.getElementById("infoNamaUser").innerText = window.sessionWarga.Nama.toUpperCase();
    document.getElementById("infoHpUser").innerText = `+${window.sessionWarga.HP}`;
    
    const imgProfile = document.getElementById("avatarImage");
    const iconProfile = document.getElementById("avatarIconDefault");
    if (window.sessionWarga.Foto && window.sessionWarga.Foto.trim() !== "") {
        imgProfile.src = window.sessionWarga.Foto;
        imgProfile.classList.remove("hidden");
        iconProfile.classList.add("hidden");
    } else {
        imgProfile.classList.add("hidden");
        iconProfile.classList.remove("hidden");
    }
}

/**
 * 5. RENDERING KALENDER SAMPAH INTERAKTIF BULANAN
 */
function renderKalenderSampahWarga() {
    const gridAngka = document.getElementById("gridAngkaKalender");
    gridAngka.innerHTML = "";

    const tglSekarang = new Date();
    const bulanSekarang = tglSekarang.getMonth();
    const tahunSekarang = tglSekarang.getFullYear();
    
    const namaBulanIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    document.getElementById("judulKalenderSampah").innerText = `Status Sampah - ${namaBulanIndo[bulanSekarang]} ${tahunSekarang}`;

    // Cari histori sampah warga di sheet SAMPAH
    const sampahWarga = window.dbTuntas.sampah.filter(s => s.HP.toString().trim() === window.sessionWarga.HP.toString().trim());

    // Ambil jumlah hari dalam bulan berjalan
    const jumlahHari = new Date(tahunSekarang, bulanSekarang + 1, 0).getDate();

    for (let hari = 1; hari <= jumlahHari; hari++) {
        // Format string tanggal pembanding: YYYY-MM-DD
        const stringHari = hari < 10 ? "0" + hari : hari;
        const stringBulan = (bulanSekarang + 1) < 10 ? "0" + (bulanSekarang + 1) : (bulanSekarang + 1);
        const formatTanggalCek = `${tahunSekarang}-${stringBulan}-${stringHari}`;

        // Cocokkan apakah ada log laporan sampah di tanggal ini
        const logHariIni = sampahWarga.find(s => s.Tanggal === formatTanggalCek);
        let warnaBg = "bg-slate-100 text-slate-500 border-slate-200/60";
        let statusTeks = "Kosong";

        if (logHariIni) {
            const stat = logHariIni.Status.toLowerCase().trim();
            if (stat === "diambil") {
                warnaBg = "bg-emerald-500 text-white border-emerald-600";
                statusTeks = "Diambil";
            } else if (stat === "tidak diambil" || stat === "lewat") {
                warnaBg = "bg-rose-500 text-white border-rose-600";
                statusTeks = "Lewat";
            }
        }

        const elemenHari = document.createElement("button");
        elemenHari.className = `p-2 text-[10px] font-black rounded-lg border shadow-2xs transition-all active:scale-90 ${warnaBg}`;
        elemenHari.innerText = hari;
        
        // Klik hari untuk memicu modal popup detail sampah bawaan HTML kamu
        elemenHari.onclick = () => {
            bukaModalDetailSampah(formatTanggalCek, statusTeks, logHariIni ? logHariIni.Waktu || "Sudah dicatat petugas" : "Belum ada aktivitas petugas.");
        };

        gridAngka.appendChild(elemenHari);
    }
}

/**
 * 6. MODAL CONTROL DETAIL SAMPAH POPUP
 */
function bukaModalDetailSampah(tanggal, status, jam) {
    document.getElementById("popTglJudul").innerText = `PENGAMBILAN: ${tanggal}`;
    document.getElementById("popStatusTeks").innerText = status.toUpperCase();
    document.getElementById("popJamWaktu").innerText = jam;

    const iconBox = document.getElementById("popBoxIcon");
    if (status === "Diambil") {
        iconBox.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-xs bg-emerald-50 text-emerald-600";
    } else if (status === "Lewat") {
        iconBox.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-xs bg-rose-50 text-rose-600";
    } else {
        iconBox.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-xs bg-slate-100 text-slate-400";
    }

    document.getElementById("mDetailSampah").classList.add("active");
}

function closeModal(idModal) {
    document.getElementById(idModal).classList.remove("active");
}

/**
 * 7. PROSES KATA SANDI & UPDATE KE SHEETS
 */
async function simpanSandiBaruSheets() {
    const passwordBaru = document.getElementById("newPass").value.trim();

    if (!passwordBaru) {
        openAlert("error", "Input Kosong", "Silakan ketik kata sandi baru Anda terlebih dahulu.");
        return;
    }

    showLoading(true);
    try {
        const params = new URLSearchParams({
            action: "updatePassword",
            hp: window.sessionWarga.HP,
            password: passwordBaru
        });

        const respon = await fetch(`${SCRIPT_URL}?${params.toString()}`, {
            method: "POST",
            mode: "cors"
        });

        const hasil = await respon.json();
        if (hasil.status === "success") {
            openAlert("success", "Sandi Diperbarui", "Kata sandi akun Anda berhasil diganti.");
            document.getElementById("newPass").value = "";
            muatSemuaDataServer();
        } else {
            throw new Error(hasil.message);
        }
    } catch (err) {
        console.error(err);
        openAlert("error", "Gagal Ganti Sandi", "Gagal mengirimkan pembaruan sandi ke server.");
    } finally {
        showLoading(false);
    }
}

/**
 * 8. UPLOAD FOTO PROFIL (ANTI RESOLUSI LIMIT VIA CANVAS COMPRESSION)
 */
function pemicuPilihFoto() {
    document.getElementById("fileFotoInput").click();
}

async function prosesKonversiFoto(input) {
    const file = input.files[0];
    if (!file) return;

    showLoading(true);
    try {
        // Kompresi gambar lewat canvas: maksimal lebar 600px dengan kualitas jpeg 80%
        const base64Data = await kompresiCanvasKeBase64(file, 600, 0.8);

        const queryParams = new URLSearchParams({
            action: "updateProfilWarga",
            hp: window.sessionWarga.HP,
            filename: `FOTO_${window.sessionWarga.HP}.jpg`,
            mimetype: "image/jpeg"
        });

        const respon = await fetch(`${SCRIPT_URL}?${queryParams.toString()}`, {
            method: "POST",
            mode: "cors",
            body: base64Data
        });

        const hasil = await respon.json();
        if (hasil.status === "success") {
            openAlert("success", "Foto Diperbarui", "Foto profil premium Anda berhasil dipasang!");
            muatSemuaDataServer();
        } else {
            throw new Error(hasil.message);
        }
    } catch (err) {
        console.error(err);
        openAlert("error", "Gagal Upload", "Sistem gagal memperbarui atau memproses unggahan foto.");
    } finally {
        showLoading(false);
    }
}

/**
 * UTILITY / ENGINE UTILS pendukung halaman warga
 */
function switchTab(idTab, tombol) {
    // Sembunyikan semua konten tab halaman dashboard
    document.querySelectorAll(".tab-content").forEach(el => {
        el.classList.add("hidden");
        el.classList.remove("active-tab");
    });
    
    // Tampilkan tab yang dipilih warga
    const tabTarget = document.getElementById(idTab);
    tabTarget.classList.remove("hidden");
    tabTarget.classList.add("active-tab");

    // Atur status styling aktif pada bar navigasi bawah figma
    document.querySelectorAll("nav button").forEach(btn => {
        btn.classList.remove("text-emerald-900", "active-tab-btn");
        btn.classList.add("text-slate-400");
    });
    
    tombol.classList.add("text-emerald-900", "active-tab-btn");
    tombol.classList.remove("text-slate-400");
}

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

function salinRekening() {
    const noRek = document.getElementById("noRekText").innerText;
    navigator.clipboard.writeText(noRek).then(() => {
        openAlert("success", "Disalin", "Nomor Rekening BCA berhasil disalin ke clipboard!");
    }).catch(() => {
        alert("Gagal menyalin otomatis, nomor rekening Anda: " + noRek);
    });
}

function kirimKonfirmasiWA() {
    const namaUser = window.sessionWarga ? window.sessionWarga.Nama : "Warga RT 04";
    const pesanWA = `Halo Pengurus RT 04 TUNTAS, Saya %2A${namaUser}%2A ingin melakukan konfirmasi bahwa saya sudah melakukan pembayaran iuran bulanan via Transfer BCA. Mohon dicek kembali kas utamanya ya, terima kasih.`;
    window.open(`https://wa.me/6281234567890?text=${pesanWA}`, "_blank");
}

function showLoading(status) {
    document.getElementById("loading").style.display = status ? "flex" : "none";
}

function openAlert(tipe, judul, pesan) {
    document.getElementById("alertTitle").innerText = judul;
    document.getElementById("alertMsg").innerText = pesan;
    const icon = document.getElementById("alertIcon");

    if (tipe === "success") {
        icon.className = "w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600";
        icon.innerHTML = `<span class="material-symbols-rounded">check_circle</span>`;
    } else {
        icon.className = "w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-rose-50 text-rose-600";
        icon.innerHTML = `<span class="material-symbols-rounded">warning</span>`;
    }
    document.getElementById("customAlert").classList.add("active");
}

function closeAlert() {
    document.getElementById("customAlert").classList.remove("active");
}

function kompresiCanvasKeBase64(file, maxWidth, quality) {
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
                if (w > maxWidth) {
                    h = Math.round((h * maxWidth) / w);
                    w = maxWidth;
                }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL("image/jpeg", quality));
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

function formatRupiah(angka) {
    return "Rp " + parseFloat(angka).toLocaleString("id-ID");
}

function loadDetailDataPribadi() {
    muatSemuaDataServer();
}

function logoutWarga() {
    localStorage.removeItem("tuntasWargaSession");
    window.sessionWarga = null;
    openAlert("success", "Keluar Akun", "Anda berhasil keluar dari Member Area TUNTAS.");
    setTimeout(() => {
        location.reload();
    }, 1200);
}
