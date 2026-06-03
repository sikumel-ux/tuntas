/**
 * TUNTAS FRONTEND ENGINE - ANGGOTA CORE (anggota.js)
 */

// URL GAS Baru Andalanmu yang 100% Valid & Terkunci Mati murni, Bro!
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycb2O7sydQVyXZZhrsqAMhTABZkFYkL2x5L2x2exlc71Y6Qm-NPiUXYsSKzTsLVR_IJIRQ/exec";

// Simulasi Identitas Warga Aktif saat login (Sesuaikan dengan LocalStorage Anda)
window.wargaLogin = JSON.parse(localStorage.getItem("wargaLogin")) || {
    HP: "62812345", // Dummy HP pencocokan data iuran & sampah
    Nama: "Haidar Abicandra"
};

// Wadah Sinkronisasi Objek Global
window.dbTuntas = {
    anggota: [],
    kas: [],
    pembayaran: [],
    sampah: []
};

/**
 * 1. INISIALISASI PEMUATAN UTAMA
 */
document.addEventListener("DOMContentLoaded", () => {
    // Set default filter tanggal di tab Kas RT (1 bulan terakhir)
    const hariIni = new Date();
    const bulanLalu = new Date();
    bulanLalu.setMonth(hariIni.getMonth() - 1);
    
    document.getElementById("fMulai").value = bulanLalu.toISOString().split('T')[0];
    document.getElementById("fSelesai").value = hariIni.toISOString().split('T')[0];

    // Ambil Data dari Server GAS Baru
    reloadData();
});

/**
 * 2. HIT SERVER / AMBIL DATA GLOBAL
 */
async function reloadData() {
    showLoading(true);
    try {
        const respon = await fetch(`${SCRIPT_URL}?action=readAllData`);
        if (!respon.ok) throw new Error("Koneksi jaringan server kurang stabil.");
        
        const hasil = await respon.json();
        if (hasil.status === "success") {
            window.dbTuntas = hasil.data;
            console.log("Database Warga Sinkron (GAS Baru):", window.dbTuntas);
            
            // Eksekusi Papan Render Komponen
            renderProfilHeader();
            renderDashboardHome();
            renderMutasiLengkap();
        } else {
            throw new Error(hasil.message);
        }
    } catch (err) {
        console.error(err);
        openAlert("error", "Sinkronisasi Gagal", "Gagal menghubungi database pusat TUNTAS dengan API baru.");
    } finally {
        showLoading(false);
    }
}

/**
 * 3. RENDER DATA PROFIL & IDENTITAS HOME
 */
function renderProfilHeader() {
    const dataWarga = window.dbTuntas.anggota.find(w => w.HP.toString().trim() === window.wargaLogin.HP.toString().trim()) || window.wargaLogin;
    
    document.getElementById("namaWarga").innerText = dataWarga.Nama.toUpperCase();
    document.getElementById("hpWarga").innerText = `+${dataWarga.HP}`;
    
    if (dataWarga.Foto && dataWarga.Foto.trim() !== "") {
        document.getElementById("avatarWarga").src = dataWarga.Foto;
    }

    // Render Status Sampah Operasional Warga
    const dataSampah = window.dbTuntas.sampah.find(s => s.HP.toString().trim() === window.wargaLogin.HP.toString().trim());
    const elSampah = document.getElementById("statusSampahWarga");
    if(dataSampah) {
        elSampah.innerText = dataSampah.Status.toUpperCase();
        if(dataSampah.Status.toLowerCase() === "diambil") {
            elSampah.className = "font-black px-2.5 py-1 rounded-lg bg-emerald-800/40 text-emerald-300 text-[9px]";
        } else {
            elSampah.className = "font-black px-2.5 py-1 rounded-lg bg-rose-950 text-rose-400 text-[9px]";
        }
    } else {
        elSampah.innerText = "AKTIF";
    }
}

/**
 * 4. RENDER SCREEN RINGKASAN & GRID KALENDER IURAN
 */
function renderDashboardHome() {
    // A. Hitung Total Saldo Bersih Selamanya
    let totalMasuk = 0, totalKeluar = 0;
    window.dbTuntas.kas.forEach(k => {
        let nom = parseFloat(k.Nominal) || 0;
        if(k.Kategori.toLowerCase().trim() === "masuk" || k.Kategori.toLowerCase().trim() === "pemasukan") totalMasuk += nom;
        if(k.Kategori.toLowerCase().trim() === "keluar" || k.Kategori.toLowerCase().trim() === "pengeluaran") totalKeluar += nom;
    });
    document.getElementById("totalSaldo").innerText = formatRupiah(totalMasuk - totalKeluar);

    // B. Render 5 Histori Transaksi Terakhir RT
    const listRiwayat = document.getElementById("listRiwayat");
    listRiwayat.innerHTML = "";
    const limaKasTerbaru = window.dbTuntas.kas.slice(-5).reverse();

    if(limaKasTerbaru.length === 0) {
        listRiwayat.innerHTML = `<p class="text-center text-[11px] text-slate-400 py-4 font-semibold">Belum ada transaksi.</p>`;
    } else {
        limaKasTerbaru.forEach(k => {
            const isMasuk = k.Kategori.toLowerCase().trim() === "masuk" || k.Kategori.toLowerCase().trim() === "pemasukan";
            const item = document.createElement("div");
            item.className = "flex justify-between items-center bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm";
            item.innerHTML = `
                <div class="space-y-0.5">
                    <p class="text-xs font-bold text-slate-800 uppercase tracking-tight">${k.Keterangan}</p>
                    <p class="text-[9px] font-semibold text-slate-400">${k.Tanggal}</p>
                </div>
                <p class="text-xs font-black ${isMasuk ? 'text-emerald-600' : 'text-rose-600'}">
                    ${isMasuk ? '+' : '-'} ${formatRupiah(k.Nominal)}
                </p>
            `;
            listRiwayat.appendChild(item);
        });
    }

    // C. Render Kalender Grid Iuran Pribadi Warga
    const gridIuran = document.getElementById("gridIuranAnggota");
    gridIuran.innerHTML = "";
    
    const iuranSaya = window.dbTuntas.pembayaran.find(p => p.HP.toString().trim() === window.wargaLogin.HP.toString().trim());
    const listBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    let lunasCounter = 0;

    listBulan.forEach(b => {
        const status = iuranSaya && iuranSaya[b] ? iuranSaya[b].toString().toUpperCase().trim() : "BELUM BAYAR";
        const lunas = status === "LUNAS";
        if(lunas) lunasCounter++;

        const box = document.createElement("div");
        box.className = `p-2.5 rounded-xl border flex flex-col justify-center items-center ${lunas ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-slate-50 border-slate-100 text-slate-400'}`;
        box.innerHTML = `
            <span class="text-[9px] font-black uppercase tracking-wider">${b.substring(0,3)}</span>
            <span class="text-[8px] font-bold opacity-80 mt-0.5">${lunas ? 'LUNAS' : 'BLM'}</span>
        `;
        gridIuran.appendChild(box);
    });

    document.getElementById("totalIuranLunas").innerText = `${lunasCounter} Bulan Lunas`;
}

/**
 * 5. RENDER TAB KAS RT LENGKAP (DENGAN FILTER TANGGAL)
 */
function renderMutasiLengkap() {
    const listMutasi = document.getElementById("listMutasiLengkap");
    listMutasi.innerHTML = "";

    const tglMulai = document.getElementById("fMulai").value;
    const tglSelesai = document.getElementById("fSelesai").value;

    const kasTerfilter = window.dbTuntas.kas.filter(k => {
        if (!tglMulai || !tglSelesai) return true;
        return k.Tanggal >= tglMulai && k.Tanggal <= tglSelesai;
    }).reverse();

    if (kasTerfilter.length === 0) {
        listMutasi.innerHTML = `<p class="text-center text-[11px] text-slate-400 py-8 font-semibold bg-white rounded-2xl border">Tidak ditemukan transaksi pada periode ini.</p>`;
        return;
    }

    kasTerfilter.forEach(k => {
        const isMasuk = k.Kategori.toLowerCase().trim() === "masuk" || k.Kategori.toLowerCase().trim() === "pemasukan";
        const item = document.createElement("div");
        item.className = "flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm";
        item.innerHTML = `
            <div class="space-y-0.5">
                <p class="text-xs font-bold text-slate-800 uppercase">${k.Keterangan}</p>
                <p class="text-[9px] font-bold text-slate-400">${k.Tanggal} <span class="ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[8px]">${k.Kategori.toUpperCase()}</span></p>
            </div>
            <p class="text-xs font-black ${isMasuk ? 'text-emerald-600' : 'text-rose-600'}">
                ${isMasuk ? '+' : '-'} ${formatRupiah(k.Nominal)}
            </p>
        `;
        listMutasi.appendChild(item);
    });
}

/**
 * 6. PROSES UPDATE FOTO PROFIL VIA CANVAS COMPRESSION
 */
async function handleGantiFoto(input) {
    const file = input.files[0];
    if (!file) return;

    showLoading(true);
    try {
        // Kompresi resolusi gambar di client-side biar hemat bandwidth GAS
        const base64Data = await kompresiGambar(file, 600, 0.8);

        const queryStr = new URLSearchParams({
            action: "updateProfilWarga",
            hp: window.wargaLogin.HP,
            filename: `FOTO_${window.wargaLogin.HP}.jpg`,
            mimetype: "image/jpeg"
        });

        const respon = await fetch(`${SCRIPT_URL}?${queryStr.toString()}`, {
            method: "POST",
            mode: "cors",
            body: base64Data
        });

        const dataRes = await respon.json();
        if (dataRes.status === "success") {
            document.getElementById("avatarWarga").src = dataRes.newFotoUrl;
            openAlert("success", "Berhasil", "Foto profil Anda berhasil diunggah.");
            reloadData();
        } else {
            throw new Error(dataRes.message);
        }
    } catch (err) {
        console.error(err);
        openAlert("error", "Gagal", "Sistem gagal memperbarui foto profil.");
    } finally {
        showLoading(false);
    }
}

/**
 * UTILITY KONTROL LAYAR & COMPONENT HELPER
 */
function st(screenId) {
    // Sembunyikan semua tab content
    document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
    // Tampilkan screen yang dipilih
    document.getElementById(`screen-${screenId}`).classList.remove("hidden");
    
    // Ganti class active pada navigasi
    document.querySelectorAll("nav button").forEach(btn => btn.classList.remove("text-emerald-900", "active"));
    document.getElementById(`n-${screenId}`).classList.add("text-emerald-900", "active");
}

function showLoading(status) {
    document.getElementById("loading").style.display = status ? "flex" : "none";
}

function openAlert(tipe, judul, pesan) {
    const iconEl = document.getElementById("alertIcon");
    document.getElementById("alertTitle").innerText = judul;
    document.getElementById("alertMsg").innerText = pesan;

    if (tipe === "success") {
        iconEl.className = "w-12 h-12 mx-auto rounded-full flex items-center justify-center text-xl font-bold bg-emerald-50 text-emerald-600";
        iconEl.innerHTML = `<span class="material-symbols-rounded">check_circle</span>`;
    } else {
        iconEl.className = "w-12 h-12 mx-auto rounded-full flex items-center justify-center text-xl font-bold bg-rose-50 text-rose-600";
        iconEl.innerHTML = `<span class="material-symbols-rounded">warning</span>`;
    }
    document.getElementById("customAlert").classList.add("active");
}

function closeAlert() {
    document.getElementById("customAlert").classList.remove("active");
}

function kompresiGambar(file, maxW, quality) {
    return new Promise((res, rej) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let w = img.width, h = img.height;
                if (w > maxW) { h = Math.round((h * maxW) / w); w = maxW; }
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, w, h);
                res(canvas.toDataURL("image/jpeg", quality));
            };
        };
        reader.onerror = rej;
    });
}

function formatRupiah(angka) {
    return "Rp " + parseFloat(angka).toLocaleString("id-ID");
}

function logout() {
    localStorage.removeItem("wargaLogin");
    openAlert("success", "Keluar", "Anda berhasil keluar dari portal warga.");
    setTimeout(() => { location.reload(); }, 1500);
}
