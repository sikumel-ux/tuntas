// ==========================================================================
// CONFIG: URL APPS SCRIPT ASLI KAMU
// ==========================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwI8UM92CtLbTAE5F8UVjnm3qT-8ITco_-bPIQIjBfokGojFhYkRfl0YP9zCpVaRfTIpg/exec"; 

// Pengendali Tampilan Loading Screen (Putih-Hijau)
function showLoading() {
    const loader = document.getElementById('loading');
    if (loader) loader.style.display = 'flex';
}

function hideLoading() {
    const loader = document.getElementById('loading');
    if (loader) loader.style.display = 'none';
}

// Navigasi Pindah Tab Menu Bawah
function bukaTab(targetId) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
    
    const targetTab = document.getElementById('tab-' + targetId);
    const targetBtn = document.getElementById('nav-' + targetId);
    
    if (targetTab) targetTab.style.display = 'block';
    if (targetBtn) targetBtn.classList.add('active');
}

// ==========================================================================
// ENGINE UTAMA: MEMBACA DATABASE EMPAT SHEET REAL-TIME
// ==========================================================================
async function loadDataDariSheets() {
    showLoading();
    try {
        const response = await fetch(SCRIPT_URL);
        if (!response.ok) throw new Error("Gagal mengambil data dari server");
        
        const result = await response.json();
        
        // Memastikan status sukses dan data bawaan Apps Script kamu lengkap
        if (result.status === "success" && result.data) {
            const db = result.data;
            
            // 1. MENGHITUNG & MENAMPILKAN TOTAL WARGA (Dari sheet "anggota")
            const jumlahWarga = db.anggota ? db.anggota.length : 0;
            document.getElementById('vTotalWarga').innerText = jumlahWarga + " Warga";

            // 2. MENGHITUNG TOTAL SALDO KAS (Dari akumulasi sheet "kas")
            // Menyesuaikan dengan header kolom di sheet kas kamu (misal kolom 'nominal' dan 'jenis')
            let hitungSaldo = 0;
            if (db.kas && db.kas.length > 0) {
                db.kas.forEach(item => {
                    // Cek ketersediaan nama kolom nominal/jumlah (disesuaikan otomatis ke huruf kecil)
                    let nominal = parseFloat(item.nominal || item.Nominal || item.jumlah || item.Jumlah) || 0;
                    let jenis = (item.jenis || item.Jenis || "Masuk").toString().trim().toLowerCase();
                    
                    if (jenis === "masuk") {
                        hitungSaldo += nominal;
                    } else if (jenis === "keluar") {
                        hitungSaldo -= nominal;
                    }
                });
            }
            document.getElementById('vTotalKas').innerText = "Rp " + hitungSaldo.toLocaleString('id-ID');

            // 3. RENDER HISTORI ALUR KAS TERAKHIR (Dari sheet "kas")
            const listKas = document.getElementById('listKas');
            if (listKas) {
                if (db.kas && db.kas.length > 0) {
                    // Ambil maksimal 5 atau 6 data kas terbaru
                    const kasTerbaru = db.kas.slice(-6).reverse(); 
                    listKas.innerHTML = kasTerbaru.map(item => {
                        let nama = item.nama || item.Nama || item.keterangan || item.Keterangan || "Tanpa Keterangan";
                        let tanggal = item.tanggal || item.Tanggal || "-";
                        let nominal = parseFloat(item.nominal || item.Nominal || item.jumlah || 0);
                        let jenis = (item.jenis || item.Jenis || "Masuk").toString().trim();

                        return `
                            <div class="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-xs border border-slate-100">
                                <div>
                                    <p class="font-bold text-slate-800 uppercase">${nama}</p>
                                    <p class="text-[10px] text-slate-400 mt-0.5">${tanggal}</p>
                                </div>
                                <p class="${jenis.toLowerCase() === 'masuk' ? 'text-emerald-600' : 'text-red-500'} font-bold text-sm">
                                    Rp ${nominal.toLocaleString('id-ID')}
                                </p>
                            </div>
                        `;
                    }).join('');
                } else {
                    listKas.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">Belum ada data transaksi kas.</p>`;
                }
            }

            // 4. RENDER DROPDOWN NAMA WARGA PADA MENU BAYAR (Dari sheet "anggota")
            const iNama = document.getElementById('iNama');
            if (iNama) {
                if (db.anggota && db.anggota.length > 0) {
                    iNama.innerHTML = db.anggota.map(warga => {
                        // Mencari kolom nama di sheet anggota kamu
                        let namaWarga = warga.nama || warga.Nama || warga.nama_lengkap || Object.values(warga)[0];
                        return `<option value="${namaWarga}">${namaWarga.toUpperCase()}</option>`;
                    }).join('');
                } else {
                    iNama.innerHTML = `<option value="">-- Tidak ada data warga --</option>`;
                }
            }

            // 5. RENDER LOG ANGKUTAN SAMPAH (Dari sheet "sampah")
            const listSampah = document.getElementById('listSampah');
            if (listSampah) {
                if (db.sampah && db.sampah.length > 0) {
                    const sampahTerbaru = db.sampah.slice(-10).reverse();
                    listSampah.innerHTML = sampahTerbaru.map(item => `
                        <div class="p-3 bg-slate-50 rounded-xl text-xs border border-slate-100 space-y-1">
                            <div class="flex justify-between font-bold text-slate-800">
                                <span class="uppercase">${item.petugas || item.Petugas || "Driver"}</span>
                                <span class="text-emerald-600">${item.status || item.Status || "Selesai"}</span>
                            </div>
                            <div class="flex justify-between text-[10px] text-slate-400">
                                <span>Keterangan: ${item.ket || item.keterangan || "-"}</span>
                                <span>${item.tanggal || item.Tanggal || "-"}</span>
                            </div>
                        </div>
                    `).join('');
                } else {
                    listSampah.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">Belum ada log angkutan sampah.</p>`;
                }
            }
        }
    } catch (error) {
        console.error("Gagal memproses data backend:", error);
        alert("Koneksi gagal atau struktur kolom sheet tidak sesuai.");
    } finally {
        hideLoading();
    }
}

// Fungsi Simpan Inputan Iuran Baru (Menyesuaikan Sistem Bawaan Apps Script)
async function simpanIuran() {
    const tgl = document.getElementById('iTgl').value;
    const nama = document.getElementById('iNama').value;
    const nominal = document.getElementById('iNom').value;

    if (!tgl || !nama || !nominal) {
        alert("Harap isi semua baris form pembayaran!");
        return;
    }

    showLoading();
    try {
        // Menggunakan URL Apps Script yang sama dengan query parameter bawaan jika diperlukan,
        // namun karena doPost bawaan kamu saat ini hanya mengenali action "updateProfilWarga",
        // pastikan backend kamu nantinya sudah mendukung action input iuran.
        await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "insertIuran",
                tanggal: tgl,
                nama: nama,
                nominal: parseFloat(nominal)
            })
        });
        
        alert("Pembayaran berhasil diproses!");
        document.getElementById('iNom').value = ""; // Bersihkan form
        loadDataDariSheets(); // Refresh data dashboard
    } catch (error) {
        alert("Gagal terhubung saat menyimpan data.");
        hideLoading();
    }
}

function logoutAdmin() {
    window.location.href = "login.html";
}

// Jalankan pembacaan data otomatis saat web pertama kali diakses
window.addEventListener('DOMContentLoaded', () => {
    const tglInput = document.getElementById('iTgl');
    if(tglInput) tglInput.value = new Date().toISOString().split('T')[0];
    loadDataDariSheets();
});
