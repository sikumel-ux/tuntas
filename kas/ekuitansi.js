// ==========================================================================
// TUNTAS - Premium E-Kuitansi Engine (Figma Style)
// ==========================================================================

// URL REST API Google Apps Script Engine yang sama dengan skrip.js
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx9JsUb0saYvFnH8vpCn2JZu_AzdrXXXmQIcGfMW0dsTvPndFQC_CtKyLhMx_6Kjd_IEg/exec";

/**
 * Fungsi Mengubah Angka Menjadi Kalimat Terbilang Bahasa Indonesia Otomatis
 */
function terbilangIndonesia(angka) {
    const bilangan = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
    let temp = "";
    const n = Math.floor(angka);

    if (n < 12) {
        temp = " " + bilangan[n];
    } else if (n < 20) {
        temp = terbilangIndonesia(n - 10) + " Belas";
    } else if (n < 100) {
        temp = terbilangIndonesia(n / 10) + " Puluh" + terbilangIndonesia(n % 10);
    } else if (n < 200) {
        temp = " Seratus" + terbilangIndonesia(n - 100);
    } else if (n < 1000) {
        temp = terbilangIndonesia(n / 100) + " Ratus" + terbilangIndonesia(n % 100);
    } else if (n < 2000) {
        temp = " Seribu" + terbilangIndonesia(n - 1000);
    } else if (n < 1000000) {
        temp = terbilangIndonesia(n / 1000) + " Ribu" + terbilangIndonesia(n % 1000);
    } else if (n < 1000000000) {
        temp = terbilangIndonesia(n / 1000000) + " Juta" + terbilangIndonesia(n % 1000000);
    }
    return temp.trim();
}

/**
 * Mengubah format tanggal standar YYYY-MM-DD menjadi format formal Indonesia
 * Contoh: 2026-04-05 -> 5 April 2026
 */
function formatTanggalIndonesia(tglStr) {
    if(!tglStr) return "-";
    const bagian = tglStr.split("-");
    if(bagian.length !== 3) return tglStr;
    
    const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const tgl = parseInt(bagian[2]);
    const bln = daftarBulan[parseInt(bagian[1]) - 1];
    const thn = bagian[0];
    
    return tgl + " " + bln + " " + thn;
}

/**
 * Kontrol Visibilitas Layer UI
 */
function tampilkanKomponen(status) {
    const loading = document.getElementById('loading');
    const konten = document.getElementById('konten');
    const penyusup = document.getElementById('penyusup');
    const footer = document.getElementById('footer-brand');

    // Sembunyikan loading screen terlebih dahulu
    loading.style.display = 'none';

    if (status === "success") {
        konten.classList.remove('hidden');
        footer.classList.remove('hidden');
    } else {
        penyusup.classList.remove('hidden');
    }
}

/**
 * Core Engine - Load Data dari Database via URL Parameter ID
 */
function muatKuitansi() {
    // 1. Ambil parameter '?id=xxxx' dari URL browser
    const urlParams = new URLSearchParams(window.location.search);
    const kuitansiId = urlParams.get('id');

    // Jika di URL tidak ada parameter ID, langsung tendang ke Error 404
    if (!kuitansiId) {
        tampilkanKomponen("error");
        return;
    }

    // 2. Fetch data murni ke Google Apps Script (Membaca Tab PEMBAYARAN di Spreadsheet 2)
    fetch(SCRIPT_URL + "?action=readAllData")
        .then(res => res.json())
        .then(res => {
            if (res.status === "error" || !res.pembayaran) {
                tampilkanKomponen("error");
                return;
            }

            // Cari baris data iuran yang Kode-nya cocok 100% dengan parameter kuitansiId
            const dataIuran = res.pembayaran.find(p => p.Kode && p.Kode.toString().trim() === kuitansiId.toString().trim());

            // Jika ID tidak terdaftar di spreadsheet, tampilkan screen 404
            if (!dataIuran) {
                tampilkanKomponen("error");
                return;
            }

            // 3. Ekstrak data & bersihkan teks bulan/keterangan iuran
            // Mengubah "Iuran Bulan: Januari, Februari" menjadi hanya "Januari, Februari"
            let bulanSaja = dataIuran.Keterangan || "-";
            if (bulanSaja.includes("Iuran Bulan:")) {
                bulanSaja = bulanSaja.replace("Iuran Bulan:", "").trim();
            }

            const nominalAngka = parseFloat(dataIuran.Nominal || 0);
            const kalimatTerbilang = terbilangIndonesia(nominalAngka) + " Rupiah";

            // 4. Suntikkan data dari spreadsheet ke DOM HTML Kuitansi
            document.getElementById('d-nama').innerText = dataIuran.Nama ? dataIuran.Nama.toUpperCase() : "-";
            document.getElementById('d-bulan').innerText = bulanSaja;
            document.getElementById('d-nominal').innerText = "Rp " + nominalAngka.toLocaleString('id-ID');
            document.getElementById('d-terbilang').innerText = "# " + kalimatTerbilang + " #";
            document.getElementById('d-tgl').innerText = formatTanggalIndonesia(dataIuran.Tanggal);
            document.getElementById('d-kode').innerText = dataIuran.Kode || "-";

            // 5. Generate QR Code Verifikasi Berbasis URL Kuitansi itu sendiri secara Realtime
            const currentUrl = window.location.href;
            const qrApiUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + encodeURIComponent(currentUrl);
            document.getElementById('qrcodeimg').src = qrApiUrl;

            // Buka layer kuitansi utama
            tampilkanKomponen("success");
        })
        .catch(err => {
            console.error("Gagal memproses kuitansi:", err);
            tampilkanKomponen("error");
        });
}

// Jalankan fungsi otomatis saat halaman kuitansi.html selesai di-load browser
window.onload = muatKuitansi;
  
