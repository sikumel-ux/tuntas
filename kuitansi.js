// =========================================================================
// TUNTAS SYSTEM - FRONTEND ENGINE FOR E-KUITANSI (GOOGLE SHEETS INTEGRATION)
// =========================================================================

// ⚠️ SILAKAN GANTI DENGAN URL WEB APP GOOGLE APPS SCRIPT (GAS) MILIKMU YANG BARU ⚠️
const GAS_DEPLOY_URL = "https://script.google.com/macros/s/AKfycbzXXXXXXXXXXXXX/exec";

// 1. Ambil Parameter ID (?id=T-xxxxxx) dari URL Browser Warga
const urlParams = new URLSearchParams(window.location.search);
const idKuitansi = urlParams.get('id');

/**
 * Fungsi untuk memunculkan screen 404 jika data tidak ditemukan atau salah link
 */
function tampilkanLayarError() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('penyusup').classList.remove('hidden');
}

/**
 * Fungsi utama untuk mengambil data secara Realtime dari Google Sheets via GAS
 */
async function ambilDataKuitansi() {
    // Validasi awal jika parameter id di URL kosong
    if (!idKuitansi) {
        return tampilkanLayarError();
    }

    try {
        // Tembak API GAS dengan action getKuitansi dan membawa ID transaksi
        const respon = await fetch(`${GAS_DEPLOY_URL}?action=getKuitansi&id=${encodeURIComponent(idKuitansi)}`);
        
        if (!respon.ok) throw new Error("Koneksi jaringan bermasalah");
        
        const hasil = await respon.json();

        // Jika data sukses ditemukan di Google Sheets, lakukan render komponen
        if (hasil && hasil.sukses === true) {
            renderKuitansiKeHTML(hasil);
        } else {
            // Jika ID tidak terdaftar atau gagal
            tampilkanLayarError();
        }
    } catch (error) {
        console.error("Gagal memuat kuitansi dari Sheets:", error);
        tampilkanLayarError();
    }
}

/**
 * Fungsi untuk menyuntikkan data hasil fetch ke elemen-elemen HTML
 */
function renderKuitansiKeHTML(data) {
    // Sembunyikan loading screen, munculkan kuitansi utama & footer branding
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('konten').classList.remove('hidden');
    document.getElementById('footer-brand').classList.remove('hidden');
    
    // Injek Data Nama dan Bulan Iuran
    document.getElementById('d-nama').innerText = data.nama || '-';
    document.getElementById('d-bulan').innerText = (data.bulan || '-').toUpperCase();
    
    // Format Angka Nominal ke Rupiah Indonesia (cth: Rp 50.000)
    const nominalUang = data.nom || 0;
    document.getElementById('d-nominal').innerText = "Rp " + Number(nominalUang).toLocaleString('id-ID');
    
    // Injek Teks Terbilang Otomatis (cth: ~ Lima Puluh Ribu Rupiah ~)
    document.getElementById('d-terbilang').innerText = `~ ${hitungTerbilang(nominalUang)} Rupiah ~`;
    
    // Format Tampilan Tanggal lokal Indonesia (cth: 1 Juni 2026)
    let tanggalTampil = "-";
    if (data.tgl) {
        const dateObj = new Date(data.tgl);
        if (!isNaN(dateObj)) {
            tanggalTampil = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        } else {
            tanggalTampil = data.tgl; // Fallback pakai string asli jika objek date gagal parse
        }
    }
    
    document.getElementById('d-tgl').innerText = tanggalTampil;
    document.getElementById('d-kode').innerText = data.kode || idKuitansi;

    // --- AUTOMATIC QR CODE GENERATOR REALTIME ---
    // QR Code mengarah ke link url kuitansi halaman ini sendiri agar bisa divalidasi keasliannya saat di-scan
    const linkSekarang = window.location.href;
    const urlApiQr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(linkSekarang)}`;
    document.getElementById('qrcodeimg').src = urlApiQr;
}

/**
 * Fungsi Algoritma Terbilang Otomatis Bahasa Indonesia
 */
function hitungTerbilang(angka) {
    angka = Math.floor(angka);
    const kataKunci = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
    
    if (angka < 12) {
        return kataKunci[angka];
    } else if (angka < 20) {
        return hitungTerbilang(angka - 10) + " Belas";
    } else if (angka < 100) {
        return hitungTerbilang(Math.floor(angka / 10)) + " Puluh " + hitungTerbilang(angka % 10);
    } else if (angka < 200) {
        return "Seratus " + hitungTerbilang(angka - 100);
    } else if (angka < 1000) {
        return hitungTerbilang(Math.floor(angka / 100)) + " Ratus " + hitungTerbilang(angka % 100);
    } else if (angka < 2000) {
        return "Seribu " + hitungTerbilang(angka - 1000);
    } else if (angka < 1000000) {
        return hitungTerbilang(Math.floor(angka / 1000)) + " Ribu " + hitungTerbilang(angka % 1000);
    }
    return "";
}

// Jalankan pencarian data secara otomatis saat halaman dibuka oleh warga
initKuitansi();

function initKuitansi() {
    // Beri sedikit delay halus 200ms saat loading spinner berputar biar estetik
    setTimeout(() => {
        ambilDataKuitansi();
    }, 200);
}
