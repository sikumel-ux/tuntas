// ==========================================================================
// CONFIG: URL APPS SCRIPT ASLI KAMU
// ==========================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwI8UM92CtLbTAE5F8UVjnm3qT-8ITco_-bPIQIjBfokGojFhYkRfl0YP9zCpVaRfTIpg/exec"; 

// Pengendali Tampilan Loading Screen (Sesuai Class CSS .loading-overlay Kamu)
function showLoading() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) loader.style.display = 'flex';
}

function hideLoading() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) loader.style.display = 'none';
}

// Navigasi Pindah Tab Menu Bawah (Sesuai Class CSS Jalur .active-tab Kamu)
function bukaTab(targetId) {
    // Sembunyikan semua konten tab dengan menghapus class active-tab
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active-tab'));
    // Hilangkan warna aktif hijau di tombol navigasi
    document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active-tab-btn'));
    
    // Aktifkan tab dan tombol yang dipilih
    const targetTab = document.getElementById('tab-' + targetId);
    const targetBtn = document.getElementById('nav-' + targetId);
    
    if (targetTab) targetTab.classList.add('active-tab');
    if (targetBtn) targetBtn.classList.add('active-tab-btn');
}

// Pengendali Custom Modal Alert (Sesuai Class CSS .modal Kamu)
function tampilAlert(title, msg, isSuccess = true) {
    const modal = document.getElementById('alertModal');
    const icon = document.getElementById('alertIcon');
    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMsg').innerText = msg;
    
    if (isSuccess) {
        icon.className = "text-3xl text-emerald-600";
        icon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    } else {
        icon.className = "text-3xl text-red-500";
        icon.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
    }
    
    if (modal) modal.style.display = 'flex';
}

function tutupAlert() {
    const modal = document.getElementById('alertModal');
    if (modal) modal.style.display = 'none';
}

// ==========================================================================
// ENGINE UTAMA: MEMBACA DATABASE DARI APPS SCRIPT
// ==========================================================================
async function loadDataDariSheets() {
    showLoading();
    try {
        const response = await fetch(SCRIPT_URL);
        if (!response.ok) throw new Error("Gagal mengambil data");
        
        const result = await response.json();
        
        if (result.status === "success" && result.data) {
            const db = result.data;
            
            // 1. JUMLAH WARGA (Dari sheet "anggota")
            const jumlahWarga = db.anggota ? db.anggota.length : 0;
            document.getElementById('vTotalWarga').innerText = jumlahWarga + " Warga";

            // 2. HITUNG SALDO KAS (Dari sheet "kas")
            let hitungSaldo = 0;
            if (db.kas && db.kas.length > 0) {
                db.kas.forEach(item => {
                    let nominal = parseFloat(item.nominal || item.Nominal || item.jumlah || item.Jumlah) || 0;
                    let jenis = (item.jenis || item.Jenis || "Masuk").toString().trim().toLowerCase();
                    if (jenis === "masuk") hitungSaldo += nominal;
                    else if (jenis === "keluar") hitungSaldo -= nominal;
                });
            }
            document.getElementById('vTotalKas').innerText = "Rp " + hitungSaldo.toLocaleString('id-ID');

            // 3. RENDER HISTORI KAS TERAKHIR
            const listKas = document.getElementById('listKas');
            if (listKas) {
                if (db.kas && db.kas.length > 0) {
                    const kasTerbaru = db.kas.slice(-6).reverse(); 
                    listKas.innerHTML = kasTerbaru.map(item => {
                        let nama = item.nama || item.Nama || item.keterangan || "Tanpa Keterangan";
                        let tanggal = item.tanggal || "-";
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
                    listKas.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">Belum ada data transaksi.</p>`;
                }
            }

            // 4. DROPDOWN PILIHAN WARGA DI FORM BAYAR
            const iNama = document.getElementById('iNama');
            if (iNama) {
                if (db.anggota && db.anggota.length > 0) {
                    iNama.innerHTML = db.anggota.map(warga => {
                        let namaWarga = warga.nama || warga.Nama || Object.values(warga)[0];
                        return `<option value="${namaWarga}">${namaWarga.toUpperCase()}</option>`;
                    }).join('');
                } else {
                    iNama.innerHTML = `<option value="">-- Tidak ada data warga --</option>`;
                }
            }

            // 5. LOG ANGKUTAN SAMPAH
            const listSampah = document.getElementById('listSampah');
            if (listSampah) {
                if (db.sampah && db.sampah.length > 0) {
                    const sampahTerbaru = db.sampah.slice(-10).reverse();
                    listSampah.innerHTML = sampahTerbaru.map(item => `
                        <div class="p-3 bg-slate-50 rounded-xl text-xs border border-slate-100 space-y-1">
                            <div class="flex justify-between font-bold text-slate-800">
                                <span class="uppercase">${item.petugas || "Driver"}</span>
                                <span class="text-emerald-600">${item.status || "Selesai"}</span>
                            </div>
                            <div class="flex justify-between text-[10px] text-slate-400">
                                <span>Ket: ${item.ket || item.keterangan || "-"}</span>
                                <span>${item.tanggal || "-"}</span>
                            </div>
                        </div>
                    `).join('');
                } else {
                    listSampah.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">Belum ada log sampah.</p>`;
                }
            }
        }
    } catch (error) {
        console.error(error);
        tampilAlert("Koneksi Gagal", "Gagal memproses data dari server.", false);
    } finally {
        hideLoading();
    }
}

// Fungsi Simpan Inputan Kuitansi / Pembayaran Iuran Warga
async function simpanIuran() {
    const tgl = document.getElementById('iTgl').value;
    const nama = document.getElementById('iNama').value;
    const nominal = document.getElementById('iNom').value;

    if (!tgl || !nama || !nominal) {
        tampilAlert("Data Kurang", "Harap isi semua kolom form pembayaran!", false);
        return;
    }

    showLoading();
    try {
        const response = await fetch(`${SCRIPT_URL}?action=insertIuran`, {
            method: "POST",
            body: JSON.stringify({
                tanggal: tgl,
                nama: nama,
                nominal: parseFloat(nominal)
            })
        });
        
        const resObj = await response.json();
        
        if (resObj.status === "success") {
            tampilAlert("Sukses", "Pembayaran berhasil disimpan ke Sheets!", true);
            document.getElementById('iNom').value = ""; // Bersihkan form nominal
            loadDataDariSheets(); // Refresh dashboard otomatis
        } else {
            throw new Error(resObj.message);
        }
    } catch (error) {
        tampilAlert("Gagal Menyimpan", "Gagal tersambung. Pastikan backend doPost sudah diupdate.", false);
        hideLoading();
    }
}

function logoutAdmin() {
    window.location.href = "login.html";
}

// Inisialisasi awal halaman
window.addEventListener('DOMContentLoaded', () => {
    const tglInput = document.getElementById('iTgl');
    if(tglInput) tglInput.value = new Date().toISOString().split('T')[0];
    loadDataDariSheets();
});
              
