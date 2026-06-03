/**
 * TUNTAS FRONTEND ENGINE - ADMIN SIDE (admin.js)
 */

// URL Gas tunggal andalanmu
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycb9F6sG4TZNJRI1BNiYGAAYb_38dG6ewbmDIoR-brYonJlA9ivCqhKCln1UxT16-NNN/exec";

// Wadah Penampung Data Sinkronisasi
window.dataTuntas = {
    anggota: [],
    kas: [],
    pembayaran: [],
    sampah: []
};

/**
 * 1. SINKRONISASI DATABASE UTAMA
 */
async function muatDatabaseAdmin() {
    console.log("Admin: Menarik data mutakhir...");
    try {
        const respon = await fetch(SCRIPT_URL + "?action=readAllData");
        if (!respon.ok) throw new Error("Gagal melakukan penarikan data.");
        
        const json = await respon.json();
        if (json.status === "success") {
            window.dataTuntas = json.data;
            console.log("Admin: Database Sinkron!", window.dataTuntas);
            
            // Render Control Table Iuran
            renderManifesIuranAdmin();
        } else {
            throw new Error(json.message);
        }
    } catch (error) {
        console.error(error);
        Swal.fire("Koneksi Gagal", "Gagal memuat ekosistem database admin.", "error");
    }
}

/**
 * 2. SUBMIT TRANSAKSI KAS UTAMA
 */
async function handleFormKas(event) {
    event.preventDefault();
    
    const kategori = document.getElementById("kasKategori").value;
    const keterangan = document.getElementById("kasKeterangan").value;
    const nominal = document.getElementById("kasNominal").value;

    Swal.fire({
        title: "Menyimpan...",
        text: "Mencatatkan data transaksi baru ke Google Sheets Kas",
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const tglLokal = new Date().toISOString().split('T')[0];
        
        // Sesuai struktur data backend, lemparkan parameter di Query string POST
        const params = new URLSearchParams({
            action: "tambahKas",
            tanggal: tglLokal,
            kategori: kategori,
            keterangan: keterangan,
            nominal: nominal
        });

        const respon = await fetch(`${SCRIPT_URL}?${params.toString()}`, {
            method: "POST",
            mode: "cors"
        });

        const hasil = await respon.json();
        if (hasil.status === "success") {
            Swal.fire("Berhasil", "Transaksi kas sukses tercatat!", "success");
            document.getElementById("formInputKas").reset();
            muatDatabaseAdmin();
        } else {
            throw new Error(hasil.message);
        }
    } catch (err) {
        console.error(err);
        Swal.fire("Gagal Menulis Data", err.message, "error");
    }
}

/**
 * 3. RENDER MANIFES DAFTAR IURAN SEMUA WARGA
 */
function renderManifesIuranAdmin() {
    const container = document.getElementById("wrapperDaftarIuranAdmin");
    container.innerHTML = "";

    if (window.dataTuntas.anggota.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 text-center py-4">Tidak ada data anggota ditemukan.</p>`;
        return;
    }

    const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    window.dataTuntas.anggota.forEach(warga => {
        const iuranWarga = window.dataTuntas.pembayaran.find(p => p.HP.toString().trim() === warga.HP.toString().trim());
        
        const cardWarga = document.createElement("div");
        cardWarga.className = "p-3 rounded-xl bg-slate-800/70 border border-slate-700/50 space-y-2 text-xs";
        
        // Buat Baris Nama Utama
        cardWarga.innerHTML = `
            <div class="flex justify-between items-center border-b border-slate-700/40 pb-1.5">
                <span class="font-bold text-slate-200">${warga.Nama}</span>
                <span class="text-[10px] text-slate-400">${warga.HP}</span>
            </div>
        `;

        // Buat Grid Bulan di bawah nama warga
        const gridBulan = document.createElement("div");
        gridBulan.className = "grid grid-cols-4 gap-1 text-center text-[10px]";

        daftarBulan.forEach(bulan => {
            const statusCurrent = iuranWarga && iuranWarga[bulan] ? iuranWarga[bulan].toString().toUpperCase().trim() : "BELUM BAYAR";
            const isLunas = statusCurrent === "LUNAS";

            const btnBulan = document.createElement("div");
            btnBulan.className = `p-1 rounded-md cursor-pointer font-medium transition-all ${isLunas ? 'bg-emerald-500 text-white font-bold' : 'bg-slate-900 text-slate-400 border border-slate-700/60'}`;
            btnBulan.innerText = bulan.substring(0, 3);
            
            // Aksi ubah status pembayaran pas diklik admin (Toggling)
            btnBulan.onclick = () => {
                const statusTarget Baru = isLunas ? "BELUM BAYAR" : "LUNAS";
                eksekusiUbahIuran(warga.HP, bulan, statusTargetBaru, warga.Nama);
            };

            gridBulan.appendChild(btnBulan);
        });

        cardWarga.appendChild(gridBulan);
        container.appendChild(cardWarga);
    });
}

/**
 * 4. EKSEKUSI TOGGLE STATUS IURAN KE SHEETS
 */
async function eksekusiUbahIuran(hpWarga, bulan, statusBaru, namaWarga) {
    Swal.fire({
        title: "Mengubah Status...",
        text: `Mengganti status iuran ${namaWarga} bulan ${bulan} menjadi ${statusBaru}`,
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const query = new URLSearchParams({
            action: "updateIuran",
            hp: hpWarga,
            bulan: bulan,
            status: statusBaru
        });

        const respon = await fetch(`${SCRIPT_URL}?${query.toString()}`, {
            method: "POST",
            mode: "cors"
        });

        const hasil = await respon.json();
        if (hasil.status === "success") {
            Swal.fire("Selesai", "Status iuran berhasil di-update!", "success");
            muatDatabaseAdmin(); // Tarik ulang data mutakhir
        } else {
            throw new Error(hasil.message);
        }
    } catch (er) {
        console.error(er);
        Swal.fire("Gagal Update", er.message, "error");
    }
}

document.addEventListener("DOMContentLoaded", muatDatabaseAdmin);
