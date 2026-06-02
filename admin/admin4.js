/**
 * REVISI TOTAL: Fungsi Simpan Iuran Admin Panel TUNTAS
 */
async function simpanIuran() {
    const tgl = document.getElementById('iTgl').value;
    const nama = document.getElementById('iNama').value;
    const nom = document.getElementById('iNom').value;
    
    // Membaca checkbox bulan terpilih dari kontainer gridBulan di admin panel kamu
    const blns = Array.from(document.querySelectorAll('input[name="blnCek"]:checked')).map(c => c.value);
    
    if(!tgl || !nama || !nom || blns.length === 0) {
        // Fallback jika fungsi alert custom kamu bernama beda, silakan sesuaikan
        alert("Silakan lengkapi data warga, nominal, dan bulan iuran!");
        return;
    }

    // Tampilkan loading screen bawaan admin panel kamu jika ada fungsi globalnya
    if (typeof showLoading === "function") showLoading(); 

    let errorCount = 0;
    let lastKodeUnik = "";
    
    // Looping jika admin menceklis lebih dari satu bulan iuran sekaligus
    for (let bln of blns) {
        let angkaAcak = Math.floor(100000 + Math.random() * 900000); 
        let kodeUnik = "T-" + angkaAcak;
        lastKodeUnik = kodeUnik;

        // Tembak data menggunakan format Form POST x-www-form-urlencoded standar GAS
        try {
            let params = new URLSearchParams();
            params.append("action", "simpanPembayaran");
            params.append("kode", kodeUnik);
            params.append("nama", nama);
            params.append("tanggal", tgl);
            params.append("keterangan", bln);
            params.append("nominal", nom);

            // URL Web App GAS milikmu yang kamu sertakan
            let response = await fetch("https://script.google.com/macros/s/AKfycbwI8UM92CtLbTAE5F8UVjnm3qT-8ITco_-bPIQIjBfokGojFhYkRfl0YP9zCpVaRfTIpg/exec", {
                method: "POST",
                body: params,
                headers: { "Content-Type": "application/x-www-form-urlencoded" }
            });
            
            let resJson = await response.json();
            if (resJson.status !== "success") errorCount++;
        } catch (e) {
            console.error(e);
            errorCount++;
        }
    }

    // Sembunyikan loading jika ada fungsi pembukanya
    if (typeof hideLoading === "function") hideLoading();

    if(errorCount === 0) {
        // Reset form input pembayaran setelah sukses
        document.getElementById('iNom').value = "";
        document.querySelectorAll('input[name="blnCek"]').forEach(c => c.checked = false);
        
        if (typeof tuntasAlert === "function") {
            tuntasAlert("Sukses", `Pembayaran iuran ${nama} berhasil dicatat.`);
        } else {
            alert(`Sukses! Pembayaran iuran ${nama} berhasil dicatat.`);
        }
        
        // Buka WhatsApp Otomatis setelah delay singkat
        setTimeout(() => {
            bukaWhatsAppKuitansiOtomatis(nama, lastKodeUnik);
        }, 1000);

        // Muat ulang data tabel internal admin panel kamu jika fungsinya tersedia
        if (typeof loadDataDariSheets === "function") await loadDataDariSheets();
        else if (typeof reloadData === "function") reloadData();
    } else {
        alert("Gagal menyimpan beberapa data iuran ke Google Sheets.");
    }
}

/**
 * ENGINE TRIGGER AUTOMATIC WHATSAPP FOR ADMIN PANEL
 */
function bukaWhatsAppKuitansiOtomatis(namaWarga, kodeReferensi) {
    // Mencari nomor HP dari database warga internal (dbGlobal) di script.js kamu
    let nomorHp = "";
    if (typeof dbGlobal !== "undefined" && dbGlobal.anggota) {
        const warga = dbGlobal.anggota.find(w => (w.Nama || w.nama || '').toString().trim().toUpperCase() === namaWarga.toUpperCase());
        nomorHp = warga ? (warga.Hp || warga.hp || '') : '';
    }

    nomorHp = nomorHp.toString().replace(/[^0-9]/g, '');
    if (nomorHp.startsWith('0')) {
        nomorHp = '62' + nomorHp.slice(1);
    }

    // ⚠️ SILAKAN GANTI domain.com DI BAWAH INI DENGAN LINK WEB HOSTING KUITANSI KAMU ⚠️
    const urlKuitansiWeb = `https://domain.com/kuitansi.html?id=${kodeReferensi}`;

    const templateTeks = 
`Halo, pak/bu *${namaWarga.trim().toUpperCase()}*..\n` +
`Pembayaran Anda telah kami terima dengan no referensi *${kodeReferensi}*.\n\n` +
`---------------------------\n` +
`Cek e-Kuitansi Anda di:\n` +
`${urlKuitansiWeb}\n` +
`---------------------------\n\n` +
`Terimakasih atas partisipasinya.\n\n` +
`Pengurus TUNTAS,\n\n` +
`*APRIL*`;

    const pesanTerencode = encodeURIComponent(templateTeks);

    let linkArahwa = `https://web.whatsapp.com/send?phone=${nomorHp}&text=${pesanTerencode}`;
    if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
        linkArahwa = `https://api.whatsapp.com/send?phone=${nomorHp}&text=${pesanTerencode}`;
    }

    window.open(linkArahwa, '_blank');
}
