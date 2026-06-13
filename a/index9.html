<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panel Admin TUNTAS - Input Iuran</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
    </style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen p-4 md:p-8">

    <div class="max-w-4xl mx-auto space-y-6">
        <!-- HEADER -->
        <div class="flex justify-between items-center bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
            <div>
                <h1 class="text-2xl font-extrabold text-emerald-400 tracking-wider">TUNTAS.</h1>
                <p class="text-xs text-slate-400">Manajemen Iuran Sampah RT 04 Dongkelan</p>
            </div>
            <div class="text-right">
                <span class="bg-emerald-500/10 text-emerald-400 text-xs px-3 py-1.5 rounded-full font-bold border border-emerald-500/20">Admin Panel Active</span>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- FORM INPUT (KIRI) -->
            <div class="md:col-span-1 bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-4 shadow-xl h-fit">
                <h2 class="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-700 pb-2">Input Iuran Baru</h2>
                <form id="formIuran" class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-400 mb-1">Nama Warga</label>
                        <input type="text" id="namaWarga" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 text-white uppercase">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-400 mb-1">Nomor WhatsApp Warga</label>
                        <input type="tel" id="noHp" placeholder="628xxxxxxxxxx" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 text-white">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-400 mb-1">Bulan Iuran</label>
                        <select id="bulanIuran" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 text-white">
                            <option value="Januari">Januari</option>
                            <option value="Februari">Februari</option>
                            <option value="Maret">Maret</option>
                            <option value="April">April</option>
                            <option value="Mei">Mei</option>
                            <option value="Juni">Juni</option>
                            <option value="Juli">Juli</option>
                            <option value="Agustus">Agustus</option>
                            <option value="September">September</option>
                            <option value="Oktober">Oktober</option>
                            <option value="November">November</option>
                            <option value="Desember">Desember</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-400 mb-1">Nominal (Rp)</label>
                        <input type="number" id="nominal" value="50000" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 text-white font-bold text-emerald-400">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-400 mb-1">Tanggal Bayar</label>
                        <input type="date" id="tanggalBayar" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 text-white">
                    </div>
                    <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition duration-200 shadow-lg text-sm flex items-center justify-center gap-2">
                        <i class="fa-solid fa-cloud-arrow-up"></i> Simpan & Buat Kuitansi
                    </button>
                </form>
            </div>

            <!-- TABEL LOG RIWAYAT (KANAN) -->
            <div class="md:col-span-2 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl flex flex-col justify-between">
                <div class="space-y-4">
                    <h2 class="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-700 pb-2">Riwayat Pembayaran Terbaru</h2>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs">
                            <thead>
                                <tr class="border-b border-slate-700 text-slate-400">
                                    <th class="py-2">Warga</th>
                                    <th class="py-2">Bulan</th>
                                    <th class="py-2">Nominal</th>
                                    <th class="py-2">Token</th>
                                    <th class="py-2 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody id="tabelRiwayat" class="divide-y divide-slate-700/50">
                                <!-- Data di-load otomatis via JS -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- SCRIPT OPERASIONAL -->
    <script>
        const DB_URL = "https://tuntas-04-default-rtdb.asia-southeast1.firebasedatabase.app";

        document.getElementById('tanggalBayar').valueAsDate = new Date();

        document.getElementById('formIuran').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nama = document.getElementById('namaWarga').value.toUpperCase().trim();
            const hp = document.getElementById('noHp').value.trim();
            const bulan = document.getElementById('bulanIuran').value;
            const nominal = document.getElementById('nominal').value;
            const tanggal = document.getElementById('tanggalBayar').value;
            const token = "T-" + Math.floor(100000 + Math.random() * 900000);

            const payload = {
                nama_warga: nama,
                no_hp: hp,
                bulan: bulan,
                nominal: nominal,
                tanggal: tanggal,
                token_kuitansi: token
            };

            try {
                const res = await fetch(`${DB_URL}/iuran_sampah.json`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if(res.ok) {
                    alert(`Data Berhasil Disimpan!\nToken Kuitansi: ${token}`);
                    document.getElementById('namaWarga').value = "";
                    
                    // FORMAT LINK AMAN UNTUK GITHUB PAGES (?id=TOKEN)
                    const linkKuitansi = `https://sikumel-ux.github.io/Tuntas/kuitansi/?id=${token}`;
                    
                    // Format Pesan WhatsApp Terkirim Otomatis
                    const pesanWA = `Halo Bapak/Ibu *${nama}*, Terima kasih telah melakukan pembayaran iuran sampah TUNTAS RT 04 untuk bulan *${bulan.toUpperCase()}* sebesar *Rp ${parseInt(nominal).toLocaleString('id-ID')}*.\n\nBerikut adalah bukti kuitansi pembayaran resmi Anda yang dapat diakses melalui tautan di bawah ini:\n\n${linkKuitansi}\n\n_Pesan ini dibuat otomatis oleh Tuntas Management._`;
                    
                    window.open(`https://api.whatsapp.com/send?phone=${hp}&text=${encodeURIComponent(pesanWA)}`, '_blank');
                    
                    muatRiwayat();
                }
            } catch (err) {
                console.error(err);
                alert("Gagal menyimpan ke database.");
            }
        });

        async function muatRiwayat() {
            try {
                const res = await fetch(`${DB_URL}/iuran_sampah.json`);
                const data = await res.json();
                const tbody = document.getElementById('tabelRiwayat');
                tbody.innerHTML = "";

                if(data) {
                    // Diurutkan dari yang paling baru diinput
                    Object.keys(data).reverse().slice(0, 10).forEach(key => {
                        const item = data[key];
                        const linkKuitansi = `https://sikumel-ux.github.io/Tuntas/kuitansi/?id=${item.token_kuitansi}`;
                        
                        const tr = document.createElement('tr');
                        tr.className = "hover:bg-slate-800/50 transition";
                        tr.innerHTML = `
                            <td class="py-3 font-bold text-white">${item.nama_warga}</td>
                            <td class="py-3 text-slate-300">${item.bulan}</td>
                            <td class="py-3 text-emerald-400 font-semibold">Rp ${parseInt(item.nominal).toLocaleString('id-ID')}</td>
                            <td class="py-3 font-mono text-slate-400">${item.token_kuitansi}</td>
                            <td class="py-3 text-right space-x-2">
                                <button onclick="salinLink('${linkKuitansi}')" class="bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-[10px] font-bold transition"><i class="fa-regular fa-copy"></i> Link</button>
                                <a href="${linkKuitansi}" target="_blank" class="bg-emerald-600 hover:bg-emerald-500 px-2 py-1 rounded text-[10px] font-bold transition inline-block"><i class="fa-solid fa-eye"></i> Cek</a>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    });
                } else {
                    tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-500">Belum ada riwayat transaksi</td></tr>`;
                }
            } catch (err) {
                console.error(err);
            }
        }

        function salinLink(text) {
            navigator.clipboard.writeText(text).then(() => {
                alert("Link kuitansi berhasil disalin ke clipboard!");
            });
        }

        window.onload = muatRiwayat;
    </script>
</body>
</html>
