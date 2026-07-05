import { db, collection, addDoc, onSnapshot, doc, deleteDoc, orderBy, query } from './firebase-config.js';

const tableBody = document.getElementById('table-pembakaran-body');
const formPembakaran = document.getElementById('form-pembakaran');

// 1. Show Skeleton Loading State
function showSkeleton() {
    tableBody.innerHTML = `
        <tr class="animate-pulse">
            <td class="p-4"><div class="h-4 bg-slate-800 rounded w-24"></div></td>
            <td class="p-4"><div class="h-4 bg-slate-800 rounded w-16"></div></td>
            <td class="p-4"><div class="h-4 bg-slate-800 rounded w-32"></div></td>
            <td class="p-4 text-center"><div class="h-8 bg-slate-800 rounded w-16 mx-auto"></div></td>
        </tr>
    `;
}
showSkeleton();

// 2. Realtime Read from Firestore
const q = query(collection(db, "pembakaran"), orderBy("tanggal", "desc"));
onSnapshot(q, (snapshot) => {
    tableBody.innerHTML = "";
    if(snapshot.empty) {
        tableBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-500">Belum ada data tercatat.</td></tr>`;
        return;
    }
    
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;
        
        const row = document.createElement('tr');
        row.className = "hover:bg-slate-900/30 transition duration-150";
        row.innerHTML = `
            <td class="p-4 font-medium">${data.tanggal}</td>
            <td class="p-4">${data.berat} Kg</td>
            <td class="p-4"><span class="px-2.5 py-1 bg-slate-800 rounded-md text-xs border border-slate-700 text-slate-300">${data.jenis_sampah}</span></td>
            <td class="p-4 text-center">
                <button class="text-red-400 hover:text-red-300 btn-delete px-2 py-1" data-id="${id}"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Attach Event Listeners to Dynamically Generated Delete Buttons
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const docId = btn.getAttribute('data-id');
            deleteLog(docId);
        });
    });
});

// 3. Create Operation (Insert)
formPembakaran?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tanggal = document.getElementById('input-tanggal').value;
    const berat = parseInt(document.getElementById('input-berat').value);
    const jenis_sampah = document.getElementById('input-jenis').value;

    try {
        await addDoc(collection(db, "pembakaran"), {
            tanggal,
            berat,
            jenis_sampah,
            timestamp: new Date()
        });
        formPembakaran.reset();
        Swal.fire({ icon: 'success', title: 'Data Berhasil Disimpan!', background: '#1e293b', color: '#fff', confirmButtonColor: '#10b981' });
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Gagal menyimpan data', text: error.message });
    }
});

// 4. Delete Operation (CRUD)
async function deleteLog(id) {
    Swal.fire({
        title: 'Apakah Anda yakin?',
        text: "Data log ini akan terhapus permanen dari Firestore!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#475569',
        confirmButtonText: 'Ya, Hapus!',
        background: '#1e293b',
        color: '#fff'
    }).then(async (result) => {
        if (result.isConfirmed) {
            await deleteDoc(doc(db, "pembakaran", id));
            Swal.fire({ title: 'Terhapus!', text: 'Data log telah dibersihkan.', icon: 'success', background: '#1e293b', color: '#fff' });
        }
    });
}
