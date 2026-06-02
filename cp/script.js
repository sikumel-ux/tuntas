// ==========================================
// CONFIG: SILAKAN SESUAIKAN URL API WEB APP KAMU DI SINI
// ==========================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyxxxxxxxxx/exec"; 

// Fungsi Pengendali Tampilan Loading Screen
function showLoading() {
    const loader = document.getElementById('loading');
    if (loader) loader.style.display = 'flex';
}

function hideLoading() {
    const loader = document.getElementById('loading');
    if (loader) loader.style.display = 'none';
}

// Fungsi Navigasi Tab Menu Bawah (Mencegah Tumpuk Layar)
function bukaTab(targetId) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
    
    const targetTab = document.getElementById('tab-' + targetId);
    const targetBtn = document.getElementById('nav-' + targetId);
    
    if (targetTab) targetTab.style.display = 'block';
    if (targetBtn) targetBtn.classList.add('active');
}

// Fungsi Notifikasi Popup Alert Mandiri
function tuntasAlert(title, msg, type = "success") {
    const m = document.getElementById('alertModal');
    const ico = document.getElementById('alertIcon');
    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMsg').innerText = msg;
    
    if (type === "error") {
        ico.className = "w-12 h-12 mx-auto rounded-full flex items-center justify-center text-xl bg-red-500/10 text-red-400 border border-red-500/20";
        ico.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
    } else {
        ico.className = "w-12 h-12 mx-auto rounded-full flex items-center justify-center text-xl bg-green-500/10 text-green-400 border border-green-500/20";
        ico.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    }
    if (m) m.classList.replace('hidden', 'flex');
}

function tutupAlert() {
    const m = document.getElementById('alertModal');
    if (m) m.classList.replace('flex', 'hidden');
}

// ==========================================
// CORE ENGINE: HIT DATA GOOGLE SHEETS
// ==========================================
async function loadDataDariSheets() {
    showLoading();
    try {
        // Simulasi hit API atau Fetch Data dari Web App Apps Script Google Sheets
        const response = await fetch(`${SCRIPT_URL}?action=readData`);
        if (!response.ok) throw new Error("Gagal mengambil data dari Google Sheets");
        
        const data = await response.json();
        
        // Suntikkan hasil data ke komponen ID di HTML
        document.getElementById('vTotalKas').innerText = data.totalKas || "Rp 0";
        document.getElementById('vTotalWarga').innerText = data.totalWarga || "0";
        
        // Render List Alur Kas Terakhir
        const listKas = document.getElementById('listKas');
        if (listKas && data.alurKas) {
            listKas.innerHTML = data.alurKas.map(item => `
                <div class="flex justify-between items-center p-2 bg-white/5 rounded-lg text-xs">
                    <div>
                        <p class="font-medium text-white uppercase">${item.nama}</p>
                        <p class="text-[10px] text-slate-400">${item.tanggal}</p>
                    </div>
                    <p class="${item.jenis === 'Masuk' ? 'text-green-400' : 'text-red-400'} font-bold">${item.nominal}</p>
                </div>
            `).join('');
        }

        // Render Dropdown Pilihan Nama Warga di Menu Bayar
        const iNama = document.getElementById('iNama');
        if (iNama && data.daftarWarga) {
            iNama.innerHTML = data.daftarWarga.map(warga => `
                <option value="${warga}">${warga.toUpperCase()}</option>
            `).join('');
        }
        
    } catch (error) {
        console.error(error);
        // Fallback pengaman jika SCRIPT_URL belum kamu isi/masih eror agar data tidak kosongan total saat demo
        document.getElementById('vTotalKas').innerText = "Rp 2.500.000";
        document.getElementById('vTotalWarga').innerText = "142";
        tuntasAlert("Info Sistem", "Menggunakan data lokal pratinjau (ganti SCRIPT_URL untuk data asli Sheets).", "success");
    } finally {
        hideLoading();
    }
}

// Fungsi Simpan Form Transaksi Iuran Ke Google Sheets
async function simpanIuran() {
    const tgl = document.getElementById('iTgl').value;
    const nama = document.getElementById('iNama').value;
    const nominal = document.getElementById('iNom').value;

    if (!tgl || !nama || !nominal) {
        tuntasAlert("Gagal", "Harap isi semua baris form pembayaran!", "error");
        return;
    }

    showLoading();
    try {
        const response = await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify({ action: "insertIuran", tanggal: tgl, nama: nama, nominal: nominal })
        });
        
        tuntasAlert("Berhasil", "Data iuran warga berhasil disimpan ke Sheets!", "success");
        loadDataDariSheets(); // Segarkan dashboard saldo
    } catch (error) {
        tuntasAlert("Gagal Simpan", "Koneksi ke Sheets bermasalah.", "error");
    } finally {
        hideLoading();
    }
}

// Fungsi Tombol Logout
function logoutAdmin() {
    showLoading();
    setTimeout(() => {
        hideLoading();
        alert("Logout Berhasil! Mengalihkan halaman...");
        window.location.href = "https//sekawan.my.id"; // Arahkan ke halaman login milikmu
    }, 800);
}

// Trigger inisialisasi awal saat halaman dibuka pertama kali
window.addEventListener('DOMContentLoaded', () => {
    // Daftarkan aksi tutup modal alert
    const btnOk = document.querySelector("#alertModal button");
    if(btnOk) btnOk.setAttribute("onclick", "tutupAlert()");

    // Set default tanggal hari ini pada form bayar
    const tglInput = document.getElementById('iTgl');
    if(tglInput) tglInput.valueToDate = new Date();

    // Jalankan load data
    loadDataDariSheets();
});
