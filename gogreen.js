const DB_URL = "https://tuntas-04-default-rtdb.asia-southeast1.firebasedatabase.app";

function formatTanggalIndo(tglStr) {
    if (!tglStr) return "-";
    if (tglStr.includes('-') && tglStr.split('-')[0].length === 2) return tglStr;
    const parts = tglStr.split('-');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return tglStr;
}

// Fungsi Accordion FAQ
function toggleFaq(btn) {
    const container = btn.nextElementSibling;
    const icon = btn.querySelector('i');
    if (container.style.maxHeight && container.style.maxHeight !== '0px') {
        container.style.maxHeight = '0px';
        icon.style.transform = 'rotate(0deg)';
    } else {
        container.style.maxHeight = container.scrollHeight + "px";
        icon.style.transform = 'rotate(180deg)';
    }
}

// 1. FETCH DATA KAS
async function muatKasMasyarakat() {
    try {
        const res = await fetch(`${DB_URL}/kas_rt04.json`);
        const data = await res.json();
        
        let totalSaldo = 0;
        let mskTotal = 0;
        let klrTotal = 0;
        let saldoBulanIni = 0;

        const hariIni = new Date();
        const tahunSekarang = hariIni.getFullYear();
        const bulanSekarang = hariIni.getMonth();

        if (data) {
            Object.keys(data).forEach(key => {
                const v = data[key];
                if (v && typeof v === 'object' && v.nominal) {
                    const nom = parseInt(v.nominal) || 0;
                    const tglItem = new Date(v.tanggal);

                    if (v.jenis === 'masuk') {
                        mskTotal += nom;
                        totalSaldo += nom;
                    } else {
                        klrTotal += nom;
                        totalSaldo -= nom;
                    }

                    if (tglItem.getFullYear() === tahunSekarang && tglItem.getMonth() === bulanSekarang) {
                        if (v.jenis === 'masuk') {
                            saldoBulanIni += nom;
                        } else {
                            saldoBulanIni -= nom;
                        }
                    }
                }
            });
        }

        document.getElementById('totalSaldoKeseluruhan').innerText = "Rp " + totalSaldo.toLocaleString('id-ID');
        document.getElementById('saldoBulanIni').innerText = "Rp " + saldoBulanIni.toLocaleString('id-ID');
        document.getElementById('textMasuk').innerText = "Rp " + mskTotal.toLocaleString('id-ID');
        document.getElementById('textKeluar').innerText = "Rp " + klrTotal.toLocaleString('id-ID');

    } catch (err) {
        console.error("Gagal memuat data kas:", err);
    }
}

// 2. FETCH DATA PENGUMUMAN
async function muatBeritaWarga() {
    try {
        const res = await fetch(`${DB_URL}/pengumuman.json`);
        const data = await res.json();
        const list = document.getElementById('listBeritaWarga');
        if (!list) return;

        if (!data) {
            list.innerHTML = `<div class="p-6 text-center text-xs text-gray-400 font-bold uppercase bg-white rounded-xl border border-gray-100 shadow-sm">Belum ada berita terbaru.</div>`;
            return;
        }

        list.innerHTML = "";
        Object.keys(data).forEach(key => {
            const item = data[key];
            if (item && typeof item === 'object') {
                list.insertAdjacentHTML('afterbegin', `
                    <div class="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                        <div class="flex justify-between items-center border-b pb-2 border-gray-100 shadow-none">
                            <h4 class="text-xs font-extrabold text-gray-800 uppercase tracking-tight" style="margin:0;">${item.judul || 'Info Warga'}</h4>
                            <span class="text-micro font-mono text-gray-400 font-bold">${formatTanggalIndo(item.tanggal)}</span>
                        </div>
                        <p class="text-xs text-gray-600 leading-relaxed font-medium mt-2" style="margin-bottom:0;">${item.isi || ''}</p>
                    </div>
                `);
            }
        });
    } catch (err) {
        console.error("Gagal memuat berita:", err);
    }
}

async function refreshData() {
    await muatKasMasyarakat();
    await muatBeritaWarga();
}

window.addEventListener('DOMContentLoaded', () => {
    refreshData();
});
