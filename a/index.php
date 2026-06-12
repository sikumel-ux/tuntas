<?php
// ========================================================
// REFACTOR TOTAL: BACKEND FIREBASE REALTIME DATABASE + SPA SCREENS
// ========================================================
session_start();

// 1. Proteksi Halaman Admin
if (!isset($_SESSION['status']) || $_SESSION['status'] != "login" || $_SESSION['role'] != "admin") {
    header("location:../login.php");
    exit();
}
include '../koneksi.php';

// KONFIGURASI FIREBASE REALTIME DATABASE (REST API)
// Silakan ganti URL ini dengan URL Firebase Realtime Database milikmu
$firebase_url = "https://tuntas04-default-rtdb.firebaseio.com/kas_umum.json";

$pesan = "";
$status_pesan = "";

// --------------------------------------------------------
// ACTION 1: HAPUS TRANSAKSI DARI FIREBASE (DELETE METHOD)
// --------------------------------------------------------
if (isset($_GET['action']) && $_GET['action'] == 'hapus_kas') {
    $firebase_key = $_GET['id']; // Menggunakan ID Key unik bawaan Firebase
    
    // Endpoint spesifik data yang dihapus: URL/key.json
    $delete_url = str_replace('.json', '/' . $firebase_key . '.json', $firebase_url);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $delete_url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "DELETE");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $res = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code == 200) {
        $pesan = "Sukses! Transaksi berhasil dihapus dari Firebase.";
        $status_pesan = "sukses";
    } else {
        $pesan = "Gagal menghapus data dari Firebase.";
        $status_pesan = "gagal";
    }
}

// --------------------------------------------------------
// ACTION 2: CATAT KAS UMUM BARU (POST TO FIREBASE)
// --------------------------------------------------------
if (isset($_POST['submit_kas'])) {
    $jenis      = $_POST['jenis']; 
    $keterangan = $_POST['keterangan'];
    $nominal    = (int)$_POST['nominal'];
    $tanggal    = (!empty($_POST['tanggal_kas'])) ? $_POST['tanggal_kas'] . ' ' . date('H:i:s') : date('Y-m-d H:i:s');

    $data_payload = json_encode([
        'jenis' => $jenis,
        'keterangan' => $keterangan,
        'nominal' => $nominal,
        'tanggal' => $tanggal
    ]);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $firebase_url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data_payload);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $res = curl_exec($ch);
    curl_close($ch);

    $pesan = "Sukses! Transaksi Kas berhasil disimpan ke Firebase.";
    $status_pesan = "sukses";
}

// --------------------------------------------------------
// ACTION 3: AMBIL DATA & KALKULASI SALDO LIVE (GET FROM FIREBASE)
// --------------------------------------------------------
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $firebase_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$saldo = 0; $total_masuk = 0; $total_keluar = 0; $histori_transaksi = [];

if ($response !== FALSE && $response !== 'null') {
    $result = json_decode($response, true);
    if (is_array($result)) {
        // Balik urutan array agar data terbaru muncul di paling atas
        $result = array_reverse($result, true); 
        
        foreach ($result as $key => $tx) {
            $nominal = isset($tx['nominal']) ? (int)$tx['nominal'] : 0;
            $jenis   = isset($tx['jenis']) ? strtolower($tx['jenis']) : 'masuk';

            if ($jenis == 'keluar') {
                $total_keluar += $nominal;
                $saldo -= $nominal;
            } else {
                $total_masuk += $nominal;
                $saldo += $nominal;
            }

            $histori_transaksi[] = [
                'id' => $key, // Menyimpan Key Unik Firebase untuk aksi hapus
                'tanggal' => $tx['tanggal'] ?? '-',
                'jenis' => $jenis,
                'keterangan' => $tx['keterangan'] ?? '-',
                'nominal' => $nominal
            ];
        }
    }
}

// Data warga lokal MySQL untuk dropdown iuran
$query_warga = mysqli_query($koneksi, "SELECT * FROM users WHERE role='user' ORDER BY id_user DESC");
$warga_array = [];
if($query_warga) {
    while($row = mysqli_fetch_assoc($query_warga)) { $warga_array[] = $row; }
}

function tglIndo($tanggal) {
    if (empty($tanggal) || $tanggal == '-') return '-';
    $split_waktu = explode(' ', $tanggal);
    $murni_tgl = $split_waktu[0];
    $pecahkan = explode('-', $murni_tgl);
    $bulan_indo = [1 => 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    if (count($pecahkan) === 3) {
        return $pecahkan[2] . ' ' . $bulan_indo[(int)$pecahkan[1]] . ' ' . $pecahkan[0];
    }
    return $tanggal;
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <link rel="manifest" href="../manifest.json">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="theme-color" content="#064E3B">
    
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>TUNTAS - Admin Dashboard</title>
    
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" />
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" />

    <script src="https://cdn.tailwindcss.com"></script>
    
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; -webkit-tap-highlight-color: transparent; }
        .custom-modal { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100% !important; height: 100% !important; background-color: rgba(15, 23, 42, 0.6) !important; backdrop-filter: blur(4px) !important; display: none; align-items: center !important; justify-content: center !important; padding: 20px !important; z-index: 9999 !important; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 antialiased selection:bg-emerald-100 pb-24">

<?php if ($pesan != ""): ?>
    <div class="fixed top-4 left-1/2 -translate-x-1/2 w-11/12 max-w-sm z-[99999] p-4 rounded-2xl shadow-lg border text-xs font-black uppercase tracking-wide flex items-center gap-2.5 transition-all duration-300 <?= $status_pesan == 'sukses' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800' ?>" id="notificationAlert">
        <i class="fa-solid <?= $status_pesan == 'sukses' ? 'fa-circle-check text-emerald-600' : 'fa-circle-xmark text-rose-600' ?> text-base"></i>
        <span class="flex-1"><?= $pesan; ?></span>
        <button type="button" onclick="document.getElementById('notificationAlert').remove();" class="opacity-50 hover:opacity-100"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <script>setTimeout(() => { var a = document.getElementById('notificationAlert'); if(a) a.remove(); }, 4000);</script>
<?php endif; ?>

<div id="mainApp" class="max-w-md mx-auto p-5 relative">
    
    <div class="w-full">
        <!-- HEADER UTAMA -->
        <header class="flex justify-between items-center mb-6">
            <div class="flex items-center gap-2.5">
                <img src="../logo.png" alt="Logo Tuntas" class="w-10 h-10 object-contain rounded-xl" onerror="this.style.display='none'">
                <div>
                    <h1 class="text-xl font-black text-emerald-900 leading-tight">Tuntas.</h1>
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Bendahara / Pengurus RT 04</p>
                </div>
            </div>
            <div>
                <button type="button" onclick="openModal('mAnggota')" class="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 text-slate-600 rounded-xl shadow-sm">
                    <i class="fa-solid fa-user-plus text-xs"></i>
                </button>
            </div>
        </header>

        <!-- ======================================================== -->
        <!-- SYSTEM SPA SCREENS (URL TIDAK BERUBAH-UBAH SAAT NAVIGASI) -->
        <!-- ======================================================== -->

        <!-- SCREEN 1: HOME -->
        <div id="screen-home" class="tab-content active space-y-5">
            <div class="p-6 bg-gradient-to-br from-emerald-800 to-emerald-950 rounded-[2.2rem] text-white shadow-xl relative overflow-hidden">
                <p class="text-[9px] font-bold opacity-60 uppercase tracking-widest">Total Saldo Terkonsolidasi Firebase</p>
                <h2 class="text-3xl font-black mt-1">Rp <?= number_format($saldo, 0, ',', '.'); ?></h2>
                <div class="mt-4 pt-3 border-t border-white/10 flex justify-between items-center">
                     <div>
                         <p class="text-[9px] font-bold opacity-50 uppercase tracking-wider">Status Sinkronisasi</p>
                         <p class="text-sm font-extrabold text-amber-300">Firebase Realtime</p>
                     </div>
                     <span class="text-[9px] font-black uppercase text-emerald-300 tracking-wider flex items-center gap-1">Live <i class="fa-solid fa-bolt text-[8px]"></i></span>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs"><i class="fa-solid fa-arrow-down"></i></div>
                    <div>
                        <p class="text-[9px] font-bold text-slate-400 uppercase">Total In</p>
                        <p class="text-sm font-black text-slate-800">Rp <?= number_format($total_masuk, 0, ',', '.'); ?></p>
                    </div>
                </div>
                <div class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div class="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-xs"><i class="fa-solid fa-arrow-up"></i></div>
                    <div>
                        <p class="text-[9px] font-bold text-slate-400 uppercase">Total Out</p>
                        <p class="text-sm font-black text-slate-800">Rp <?= number_format($total_keluar, 0, ',', '.'); ?></p>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
                <button type="button" onclick="openModal('mKas')" class="bg-white border-2 border-emerald-900 text-emerald-900 p-3.5 rounded-2xl font-black text-[10px] uppercase shadow-sm">Catat Kas</button>
                <button type="button" onclick="st('bayar')" class="bg-emerald-950 text-white p-3.5 rounded-2xl font-black text-[10px] uppercase shadow-sm">Input Iuran</button>
            </div>

            <!-- HISTORI TRANSAKSI FIREBASE -->
            <div class="space-y-3 pt-2">
                <div class="flex items-center gap-2 border-b pb-1.5">
                    <i class="fa-solid fa-clock-rotate-left text-slate-400 text-xs"></i>
                    <h3 class="text-xs font-black text-slate-500 uppercase tracking-wider">Histori Transaksi Firebase</h3>
                </div>
                
                <div class="space-y-2">
                    <?php if(!empty($histori_transaksi)): 
                        foreach($histori_transaksi as $tx): 
                            $color_txt = ($tx['jenis'] == 'keluar') ? 'text-rose-600' : 'text-emerald-600';
                        ?>
                        <div class="bg-white p-3.5 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                            <div class="space-y-0.5 pr-2 flex-1">
                                <h4 class="text-xs font-bold text-slate-800 uppercase"><?= htmlspecialchars($tx['keterangan']); ?></h4>
                                <p class="text-[9px] text-slate-400 font-bold"><?= tglIndo($tx['tanggal']); ?></p>
                            </div>
                            <div class="flex items-center gap-3">
                                <span class="text-xs font-black <?= $color_txt; ?> whitespace-nowrap">
                                    <?= ($tx['jenis'] == 'keluar') ? '-' : '+'; ?> Rp <?= number_format($tx['nominal'], 0, ',', '.'); ?>
                                </span>
                                <!-- ACTION HAPUS BERBASIS ID KEY FIREBASE -->
                                <a href="?action=hapus_kas&id=<?= $tx['id']; ?>" 
                                   onclick="return confirm('Yakin ingin menghapus transaksi ini dari Firebase?')" 
                                   class="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center transition-all active:scale-90">
                                    <i class="fa-regular fa-trash-can text-[10px]"></i>
                                </a>
                            </div>
                        </div>
                    <?php endforeach; else: ?>
                        <div class="bg-white p-4 rounded-2xl text-center border border-slate-100 text-slate-400 text-xs">
                            <i class="fa-solid fa-folder-open block text-base mb-1 text-slate-300"></i>
                            Belum ada riwayat mutasi kas di Firebase.
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <!-- SCREEN 2: BAYAR IURAN -->
        <div id="screen-bayar" class="tab-content space-y-4">
            <div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                <h3 class="font-black text-emerald-900 uppercase text-center text-xs tracking-wider border-b pb-2">Input Pembayaran Iuran</h3>
                <div class="space-y-3">
                    <div>
                        <label class="text-[9px] font-bold text-slate-400 uppercase ml-1">Tanggal Bayar</label>
                        <input type="date" id="iTglAdmin" class="w-full mt-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none">
                    </div>
                    <div>
                        <label class="text-[9px] font-bold text-slate-400 uppercase ml-1">Nama Warga</label>
                        <select id="nama_warga_iuran" class="w-full mt-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none">
                            <?php if(!empty($warga_array)): foreach($warga_array as $w): ?>
                                <option value="<?= htmlspecialchars($w['nama_warga']); ?>"><?= htmlspecialchars($w['nama_warga']); ?></option>
                            <?php endforeach; endif; ?>
                        </select>
                    </div>
                    <div>
                        <label class="text-[9px] font-bold text-slate-400 uppercase ml-1">Bulan Iuran</label>
                        <select id="bulan_iuran" class="w-full mt-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700">
                            <option value="Januari">Januari</option><option value="Februari">Februari</option><option value="Maret">Maret</option><option value="April">April</option>
                            <option value="Mei">Mei</option><option value="Juni" selected>Juni</option><option value="Juli">Juli</option><option value="Agustus">Agustus</option>
                            <option value="September">September</option><option value="Oktober">Oktober</option><option value="November">November</option><option value="Desember">Desember</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-[9px] font-bold text-slate-400 uppercase ml-1">Nominal (Rp)</label>
                        <input type="number" id="nominal_iuran" value="20000" class="w-full mt-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-black text-emerald-800">
                    </div>
                    <button type="button" onclick="alert('Iuran berhasil di-submit (Modul Terkunci)')" class="w-full bg-emerald-900 text-white p-3.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-md">Simpan Iuran</button>
                </div>
            </div>
        </div>

        <!-- SCREEN 3: KUITANSI -->
        <div id="screen-kuitansi" class="tab-content space-y-4">
            <div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center py-12">
                <span class="material-symbols-rounded text-4xl text-slate-300 block mb-2">receipt_long</span>
                <h3 class="font-black text-slate-700 uppercase text-xs tracking-wider">Modul Kuitansi Digital</h3>
                <p class="text-[11px] text-slate-400 mt-1">Halaman kuitansi terintegrasi dalam sistem layar tunggal.</p>
            </div>
        </div>

        <!-- SCREEN 4: BERITA -->
        <div id="screen-berita" class="tab-content space-y-4">
            <div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center py-12">
                <span class="material-symbols-rounded text-4xl text-slate-300 block mb-2">newspaper</span>
                <h3 class="font-black text-slate-700 uppercase text-xs tracking-wider">Manajemen Berita RT</h3>
                <p class="text-[11px] text-slate-400 mt-1">Kelola info kegiatan dan pengumuman warga RT 04.</p>
            </div>
        </div>

        <!-- SCREEN 5: LAPORAN -->
        <div id="screen-laporan" class="tab-content space-y-4">
            <div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center py-12">
                <span class="material-symbols-rounded text-4xl text-slate-300 block mb-2">monitoring</span>
                <h3 class="font-black text-slate-700 uppercase text-xs tracking-wider">Laporan Grafik & Kas</h3>
                <p class="text-[11px] text-slate-400 mt-1">Analisa visual pemasukan dan pengeluaran kas bulanan.</p>
            </div>
        </div>

    </div>

    <!-- ======================================================== -->
    <!-- FIXED NAV BAR: HOME, BAYAR, KUITANSI, BERITA, LAPORAN   -->
    <!-- ======================================================== -->
    <nav class="fixed bottom-0 inset-x-0 h-16 bg-white border-t border-slate-100 flex justify-around items-center px-1 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.02)] max-w-md mx-auto">
        <button type="button" onclick="st('home')" id="n-home" class="flex flex-col items-center gap-0.5 text-slate-400 w-full transition-all">
            <span class="material-symbols-rounded !text-lg">home</span>
            <span class="text-[8px] font-bold uppercase tracking-tight">Home</span>
        </button>
        <button type="button" onclick="st('bayar')" id="n-bayar" class="flex flex-col items-center gap-0.5 text-slate-400 w-full transition-all">
            <span class="material-symbols-rounded !text-lg">payments</span>
            <span class="text-[8px] font-bold uppercase tracking-tight">Bayar</span>
        </button>
        <button type="button" onclick="st('kuitansi')" id="n-kuitansi" class="flex flex-col items-center gap-0.5 text-slate-400 w-full transition-all">
            <span class="material-symbols-rounded !text-lg">receipt_long</span>
            <span class="text-[8px] font-bold upperc
