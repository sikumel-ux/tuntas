const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx9JsUb0saYvFnH8vpCn2JZu_AzdrXXXmQIcGfMW0dsTvPndFQC_CtKyLhMx_6Kjd_IEg/exec";
const DRIVE_FOLDER_ID = "1FNIuGWMADgYO2Kk-KLmemSKmDzu46LM1"; // ID Folder Google Drive terlampir

window.dbTuntas = { kas: [], pembayaran: [], anggota: [], sampah: [] };
window.sessionWarga = null;

const currentYear = new Date().getFullYear();
const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

document.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem("tuntasWargaSession");
    if (saved) {
        window.sessionWarga = JSON.parse(saved);
        document.getElementById("screen-login").classList.add("hidden");
        document.getElementById("screen-dashboard").classList.remove("hidden");
        muatDataWargaDariServer();
    }
});

async function prosesLoginWarga() {
    const inputHp = document.getElementById("lHp").value.trim();
    const inputPass = document.getElementById("lPass").value.trim();

    if (!inputHp || !inputPass) {
        openAlert("error", "Gagal Masuk", "Nomor Whatsapp dan Kata Sandi wajib diisi!");
        return;
    }

    showLoading(true);
    try {
        const res = await fetch(`${SCRIPT_URL}?action=readAllData`);
        const hasil = await res.json();
        
        if (hasil.status === "success") {
            const dataMurni = hasil.data ? hasil.data : hasil;
            window.dbTuntas.kas = dataMurni.kas || [];
            window.dbTuntas.pembayaran = dataMurni.pembayaran || [];
            window.dbTuntas.anggota = dataMurni.anggota || [];
            window.dbTuntas.sampah = dataMurni.sampah || [];

            let formatInput = inputHp.replace(/\D/g, "");
            if (formatInput.startsWith("0")) formatInput = "62" + formatInput.substring(1);
            if (formatInput.startsWith("8")) formatInput = "62" + formatInput;

            const warga = window.dbTuntas.anggota.find(w => {
                let numDb = (w.Hp || w.hp || "").toString().replace(/\D/g, "");
                if (numDb.startsWith("0")) numDb = "62" + numDb.substring(1);
                if (numDb.startsWith("8")) numDb = "62" + numDb;
                return numDb === formatInput;
            });

            if (!warga) {
                openAlert("error", "Akses Ditolak", "Nomor Whatsapp tidak ditemukan dalam database RT 04.");
                return;
            }

            const passDb = (warga.Password || warga.password || "").toString().trim();
            if (passDb !== inputPass) {
                openAlert("error", "Akses Ditolak", "Kata sandi yang Anda masukkan salah.");
                return;
            }

            window.sessionWarga = {
                Nama: warga.Nama || warga.nama,
                Hp: warga.Hp || warga.hp,
                Password: passDb,
                Foto: warga.Foto || warga.foto || "",
                Bergabung: warga.Bergabung || warga.bergabung || ""
            };

            localStorage.setItem("tuntasWargaSession", JSON.stringify(window.sessionWarga));
            
            document.getElementById("screen-login").classList.add("hidden");
            document.getElementById("screen-dashboard").classList.remove("hidden");
            
            renderSemuaHalamanWarga();
        } else {
            throw new Error(hasil.message);
        }
    } catch (err) {
        console.error(err);
        openAlert("error", "Error Jaringan", "Sistem gagal otentikasi atau membaca gerbang database.");
    } finally {
        showLoading(false);
    }
}

async function muatDataWargaDariServer() {
    showLoading(true);
    try {
        const res = await fetch(`${SCRIPT_URL}?action=readAllData`);
        const hasil = await res.json();
        if (hasil.status === "success") {
            const dataMurni = hasil.data ? hasil.data : hasil;
            window.dbTuntas.kas = dataMurni.kas || [];
            window.dbTuntas.pembayaran = dataMurni.pembayaran || [];
            window.dbTuntas.anggota = dataMurni.anggota || [];
            window.dbTuntas.sampah = dataMurni.sampah || [];

            const syncUser = window.dbTuntas.anggota.find(w => (w.Nama || "").toLowerCase().trim() === window.sessionWarga.Nama.toLowerCase().trim());
            if (syncUser) {
                window.sessionWarga.Foto = syncUser.Foto || syncUser.foto || "";
                window.sessionWarga.Password = syncUser.Password || syncUser.password || "";
                window.sessionWarga.Bergabung = syncUser.Bergabung || syncUser.bergabung || "";
                localStorage.setItem("tuntasWargaSession", JSON.stringify(window.sessionWarga));
            }
            renderSemuaHalamanWarga();
        }
    } catch (e) {
        console.error(e);
    } finally {
        showLoading(false);
    }
}

function inisialisasiFilterBulan() {
    const sel = document.getElementById("filterBulanKas");
    if (!sel) return;
    sel.innerHTML = "";
    const mSekarang = new Date().getMonth();
    daftarBulan.forEach((b, index) => {
        const opt = document.createElement("option");
        opt.value = index;
        opt.innerText = `${b} ${currentYear}`;
        if(index === mSekarang) opt.selected = true;
        sel.appendChild(opt);
    });
}

function renderSemuaHalamanWarga() {
    if (!window.sessionWarga) return;

    document.getElementById("infoNamaUser").innerText = window.sessionWarga.Nama.toUpperCase();
    document.getElementById("infoHpUser").innerText = `+${window.sessionWarga.Hp}`;
    document.getElementById("infoBergabung").innerHTML = `<i class="fa-solid fa-calendar-check mr-1.5"></i> Warga Sejak: ${window.sessionWarga.Bergabung || '-'}`;

    let masuk = 0; let keluar = 0;
    (window.dbTuntas.kas || []).forEach(k => {
        const n = parseFloat(k.Nominal || 0);
        if ((k.Kategori || "").toLowerCase() === 'masuk') masuk += n; else keluar += n;
    });
    document.getElementById("dashPemasukanKas").innerText = formatRupiah(masuk);
    document.getElementById("dashPengeluaranKas").innerText = formatRupiah(keluar);
    document.getElementById("dashSisaSaldoKas").innerText = formatRupiah(masuk - keluar);

    if(document.getElementById("filterBulanKas").children.length === 0) {
        inisialisasiFilterBulan();
    }
    renderHistoriKasSebulan();

    const iuranSaya = (window.dbTuntas.pembayaran || []).filter(p => (p.Nama || "").toLowerCase().trim() === window.sessionWarga.Nama.toLowerCase().trim());
    const gridBulan = document.getElementById("statusBulanGrid");
    gridBulan.innerHTML = "";
    daftarBulan.forEach(b => {
        const lunas = iuranSaya.some(p => (p.Keterangan || "").includes(b));
        gridBulan.innerHTML += `
            <div class="p-2.5 rounded-xl border text-center flex flex-col justify-center items-center ${lunas ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-slate-50 border-slate-100 text-slate-300'}">
                <span class="text-[9px] font-black uppercase tracking-tight">${b.substring(0,3)}</span>
                <span class="text-[8px] font-black mt-0.5">${lunas ? 'LUNAS' : 'BELUM'}</span>
            </div>`;
    });

    const listHistoriIuran = document.getElementById("listHistoriIuranWarga");
    listHistoriIuran.innerHTML = "";
    if(iuranSaya.length === 0) {
        listHistoriIuran.innerHTML = `<p class="text-center text-[10px] text-slate-400 py-2">Belum ada rekaman pembayaran iuran.</p>`;
    } else {
        [...iuranSaya].reverse().forEach(p => {
            listHistoriIuran.innerHTML += `
                <div class="flex justify-between items-center py-2 border-b border-slate-50 text-[11px] last:border-none">
                    <div>
                        <p class="font-bold text-slate-700">${p.Keterangan}</p>
                        <p class="text-[8px] text-slate-400 font-bold">${p.Tanggal}</p>
                    </div>
                    <p class="font-black text-emerald-600">${formatRupiah(p.Nominal)}</p>
                </div>`;
        });
    }

    const tgl = new Date();
    document.getElementById("namaBulanSampah").innerText = `${daftarBulan[tgl.getMonth()]} ${tgl.getFullYear()}`;
    renderKalenderSampah();

    const img = document.getElementById("avatarImage");
    const defIcon = document.getElementById("avatarIconDefault");
    if (window.sessionWarga.Foto && window.sessionWarga.Foto !== "-" && window.sessionWarga.Foto.trim() !== "") {
        img.src = window.sessionWarga.Foto;
        img.classList.remove("hidden");
        defIcon.classList.add("hidden");
    } else {
        img.classList.add("hidden");
        defIcon.classList.remove("hidden");
    }
}

function renderHistoriKasSebulan() {
    const filterIdx = parseInt(document.getElementById("filterBulanKas").value);
    const containerMutasi = document.getElementById("listMutasiKasDashboard");
    containerMutasi.innerHTML = "";

    const dataKasFiltered = (window.dbTuntas.kas || []).filter(k => {
        if(!k.Tanggal) return false;
        let porsi = k.Tanggal.split(/[-/]/);
        let blnKas = parseInt(porsi[1]) - 1;
        return blnKas === filterIdx;
    });

    if(dataKasFiltered.length === 0) {
        containerMutasi.innerHTML = `<p class="text-center text-[10px] text-slate-400 py-6 font-medium">Tidak ada transaksi kas di bulan ini.</p>`;
    } else {
        [...dataKasFiltered].reverse().forEach(k => {
            const isMasuk = (k.Kategori || "").toLowerCase() === 'masuk';
            containerMutasi.innerHTML += `
                <div class="flex justify-between items-center py-2.5 border-b border-slate-100 text-[11px] last:border-none">
                    <div>
                        <p class="font-bold text-slate-700 uppercase tracking-tight">${k.Keterangan}</p>
                        <p class="text-[8px] text-slate-400 font-bold mt-0.5">${k.Tanggal}</p>
                    </div>
                    <p class="font-black ${isMasuk ? 'text-emerald-600' : 'text-rose-600'}">${isMasuk ? '+' : '-'} ${formatRupiah(k.Nominal)}</p>
                </div>`;
        });
    }
}

function renderKalenderSampah() {
    const grid = document.getElementById("gridAngkaKalender");
    grid.innerHTML = "";
    const tgl = new Date();
    const jmlHari = new Date(tgl.getFullYear(), tgl.getMonth() + 1, 0).getDate();
    const sampahSaya = (window.dbTuntas.sampah || []).filter(s => (s.Nama || "").toLowerCase().trim() === window.sessionWarga.Nama.toLowerCase().trim());

    for (let i = 1; i <= jmlHari; i++) {
        const strHari = `${tgl.getFullYear()}-${String(tgl.getMonth()+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        const log = sampahSaya.find(s => s.Tanggal === strHari);
        
        let cls = "bg-slate-50 text-slate-400 border-slate-100";
        let status = "Belum Di-record";
        
        if (log) {
            if ((log.Status || "").toLowerCase() === "diambil") {
                cls = "bg-emerald-500 text-white border-emerald-600 shadow-emerald-100"; status = "Diambil Petugas";
            } else {
                cls = "bg-rose-500 text-white border-rose-600 shadow-rose-100"; status = "Petugas Terlewat";
            }
        }

        grid.innerHTML += `<button onclick="bukaModalDetailSampah('${strHari}', '${status}')" class="p-2 text-[10px] font-black rounded-xl border shadow-3xs active:scale-90 transition-all ${cls}">${i}</button>`;
    }
}

function bukaModalDetailSampah(tgl, status) {
    document.getElementById("popTglJudul").innerText = tgl;
    document.getElementById("popStatusTeks").innerText = status.toUpperCase();
    document.getElementById("popJamWaktu").innerText = status.includes("Diambil") ? "Armada berhasil mengangkut sampah." : "Armada tidak melintas / libur.";
    
    const modal = document.getElementById("mDetailSampah");
    const pop = modal.querySelector(".modal-popup");
    modal.classList.add("active");
    pop.classList.add("active");
}

async function updateSandiWarga() {
    const pass = document.getElementById("newPass").value.trim();
    if(!pass) return openAlert("error", "Input Kosong", "Masukkan kata sandi baru.");

    showLoading(true);
    try {
        const res = await fetch(`${SCRIPT_URL}?action=updatePassword&hp=${window.sessionWarga.Hp}&password=${pass}`, { method: 'POST' });
        const r = await res.json();
        if(r.status === "success") {
            openAlert("success", "Berhasil", "Kata sandi sukses diperbarui!");
            document.getElementById("newPass").value = "";
            muatDataWargaDariServer();
        }
    } catch(e) {
        openAlert("error", "Gagal", "Sistem gagal mengirim data update.");
    } finally { showLoading(false); }
}

function pemicuUploadFoto() { document.getElementById("fileFotoInput").click(); }

async function unggahFotoProfil(input) {
    const file = input.files[0];
    if (!file) return;

    showLoading(true);
    const r = new FileReader();
    r.readAsDataURL(file);
    r.onload = async () => {
        try {
            const res = await fetch(`${SCRIPT_URL}?action=updateProfilWarga&hp=${window.sessionWarga.Hp}`, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ 
                    image: r.result, 
                    filename: `AVATAR_${window.sessionWarga.Nama.replace(/\s+/g, '_')}_${Date.now()}`, 
                    mimeType: file.type,
                    folderId: DRIVE_FOLDER_ID // Dikirimkan ke folder tujuan Google Drive
                })
            });
            const hasil = await res.json();
            if(hasil.status === "success") {
                openAlert("success", "Berhasil", "Foto profil Anda berhasil diunggah langsung ke Google Drive!");
                muatDataWargaDariServer();
            } else {
                throw new Error(hasil.message);
            }
        } catch(e) {
            console.error(e);
            openAlert("error", "Gagal Unggah", "Foto gagal terkirim. Periksa hak izin berkas Drive script.");
        } finally { showLoading(false); input.value = ""; }
    };
}

function gantiTab(id, btn) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
    document.querySelectorAll("nav button").forEach(b => b.classList.remove("active-tab-btn"));
    btn.classList.add("active-tab-btn");
}

function togglePasswordWarga(inpId, iconId) {
    const el = document.getElementById(inpId);
    const ic = document.getElementById(iconId);
    if(el.type === "password") { el.type = "text"; ic.className = "fa-solid fa-eye text-sm"; }
    else { el.type = "password"; ic.className = "fa-solid fa-eye-slash text-sm"; }
}

function salinNoRek() {
    navigator.clipboard.writeText(document.getElementById("noRekText").innerText);
    openAlert("success", "Disalin", "Nomor rekening BCA berhasil dicopy ke clipboard.");
}

function kirimKonfirmasiWA() {
    window.open(`https://wa.me/6281234567890?text=${encodeURIComponent("Halo Pengurus TUNTAS RT 04 Dongkelan, saya ingin konfirmasi pembayaran iuran kas bulanan warga.")}`, "_blank");
}

function openAlert(type, title, msg) {
    document.getElementById("alertTitle").innerText = title;
    document.getElementById("alertMsg").innerText = msg;
    const icon = document.getElementById("alertIcon");
    icon.className = "w-12 h-12 mx-auto rounded-full flex items-center justify-center " + (type === "error" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600");
    icon.innerHTML = `<span class="material-symbols-rounded">${type === "error" ? "warning" : "check_circle"}</span>`;
    document.getElementById("customAlert").classList.add("active");
}

function closeAlert() { document.getElementById("customAlert").classList.remove("active"); }

function closeModal(id) {
    const modal = document.getElementById(id);
    const pop = modal.querySelector(".modal-popup");
    if(pop) pop.classList.remove("active");
    modal.classList.remove("active");
}

function showLoading(st) { document.getElementById("loading").style.display = st ? "flex" : "none"; }
function formatRupiah(n) { return "Rp " + parseFloat(n || 0).toLocaleString("id-ID"); }
function logoutWarga() { localStorage.removeItem("tuntasWargaSession"); location.reload(); }
