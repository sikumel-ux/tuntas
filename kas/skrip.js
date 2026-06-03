/**
 * TUNTAS FRONTEND ENGINE - ADMIN SIDE (admin.js)
 * Mengontrol Input Kas & Verifikasi Pembayaran Iuran Warga
 */

// URL Gas andalanmu yang BENAR 100% dan dikunci mati murni, Bro!
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycb9F6sG4TZNJRI1BNiYGAAYb_38dG6ewbmDIoR-brYonJlA9ivCqhKCln1UxT16-NNN/exec";

// Variabel Global untuk menampung data mentah dari database Google Sheets
window.dataTuntasAdmin = {
    anggota: [],
    kas: [],
    pembayaran: [],
    sampah: []
};

/**
 * 1. FUNGSI AMBIL DATA UTAMA (Otomatis load saat halaman admin dibuka)
 */
async function muatDatabaseAdmin() {
    console.log("Admin: Menghubungi database Google Sheets...");
    try {
        const respon = await fetch(SCRIPT_URL + "?action=readAllData");
        if (!respon.ok) throw new Error("Koneksi jaringan internet tidak stabil.");
        
        const json = await respon.json();

        if (json.status === "success") {
            console.log("Admin: Data berhasil dimuat!", json.data);
            window.dataTuntasAdmin = json.data;
            
            // Panggil fungsi render UI dashboard admin kamu di sini, contoh:
            // renderTabelKasAdmin();
            // renderTabelIuranWarga();
        } else {
            console.error("Admin: Eror Server GAS:", json.message);
            tuntasAdminAlert("Eror Database", "Gagal mengambil data dari Google Sheets.", "error");
        }
    } catch (eror) {
        console.error("Admin: Gagal Fetching:", eror);
        tuntasAdminAlert("Koneksi Gagal", "Gagal menghubungi database Google Sheets. Periksa koneksi internet Anda.", "error");
    }
}

/**
 * 2. FITUR INPUT TRANSAKSI KAS BARU (Masuk / Keluar)
 * @param {string} kategori - Contoh: "Pemasukan" atau "Pengeluaran"
 * @param {string} keterangan - Uraian catatan kas (misal: "Iuran Sampah RT", "Beli Lampu")
 * @param {number} nominal - Jumlah uang (angka murni tanpa Rp atau titik)
 */
async function tambahTransaksiKas(kategori, keterangan, nominal) {
    if (!kategori || !keterangan || !nominal || nominal <= 0) {
        tuntasAdminAlert("Peringatan", "Semua kolom data kas wajib diisi dengan benar!", "warning");
        return;
    }

    tuntasAdminAlert("Memproses", "Mencatat transaksi kas baru...", "info");

    try {
        // Ambil tanggal hari ini secara otomatis (format: YYYY-MM-DD)
        const tanggalHariIni = new Date().toISOString().split('T')[0];

        const queryParams = new URLSearchParams({
            action: "tambahKas", 
            tanggal: tanggalHariIni,
            kategori: kategori,
            keterangan: keterangan,
            nominal: nominal
        });

        const respon = await fetch(SCRIPT_URL + "?" + queryParams.toString(), {
            method: "POST",
            mode: "cors"
        });

        const hasil = await respon.json();

        if (hasil.status === "success") {
            tuntasAdminAlert("Sukses", "Transaksi kas berhasil dicatat ke Spreadsheet KAS!", "success");
            muatDatabaseAdmin(); // Refresh data biar saldo & tabel ter-update otomatis
        } else {
            throw new Error(hasil.message);
        }
    } catch (error) {
        console.error("Admin: Gagal tambah kas:", error);
        tuntasAdminAlert("Gagal", "Gagal menyimpan data kas: " + error.message, "error");
    }
}

/**
 * 3. FITUR UPDATE STATUS IURAN / PEMBAYARAN WARGA
 * @param {string} noHpWarga - Nomor HP warga sebagai ID baris
 * @param {string} bulan - Kolom bulan yang mau di-update (misal: "Januari", "Februari")
 * @param {string} statusBaru - Status baru (contoh: "LUNAS", "BELUM BAYAR")
 */
async function updateIuranWarga(noHpWarga, bulan, statusBaru) {
    if (!noHpWarga || !bulan || !statusBaru) {
        tuntasAdminAlert("Peringatan", "Parameter update iuran tidak lengkap!", "warning");
        return;
    }

    tuntasAdminAlert("Memproses", "Memperbarui status pembayaran warga...", "info");

    try {
        const queryParams = new URLSearchParams({
            action: "updateIuran", 
            hp: noHpWarga,
            bulan: bulan,
            status: statusBaru
        });

        const respon = await fetch(SCRIPT_URL + "?" + queryParams.toString(), {
            method: "POST",
            mode: "cors"
        });

        const hasil = await respon.json();

        if (hasil.status === "success") {
            tuntasAdminAlert("Sukses", "Status pembayaran iuran berhasil diperbarui!", "success");
            muatDatabaseAdmin(); // Refresh UI admin otomatis
        } else {
            throw new Error(hasil.message);
        }
    } catch (error) {
        console.error("Admin: Gagal update iuran:", error);
        tuntasAdminAlert("Gagal", "Gagal merubah data iuran: " + error.message, "error");
    }
}

/**
 * ======================== UTILITY HELPER FOR ADMIN ========================
 */

function tuntasAdminAlert(judul, pesan, tipe) {
    if (typeof Swal !== "undefined") {
        Swal.fire(judul, pesan, tipe);
    } else {
        alert("[" + judul + "] \n" + pesan);
    }
}

// Jalankan penarikan data total database sesaat setelah halaman admin HTML selesai dimuat
document.addEventListener("DOMContentLoaded", muatDatabaseAdmin);
