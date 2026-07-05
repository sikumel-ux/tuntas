// Remove Loader Screen
window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    loader.classList.add('opacity-0');
    setTimeout(() => loader.remove(), 500);
});

// Initialize AOS (Animate On Scroll)
AOS.init({
    duration: 1000,
    once: true,
    easing: 'ease-in-out'
});

// Dark Mode Toggler
const themeToggleBtn = document.getElementById('theme-toggle');
if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
} else {
    document.documentElement.classList.remove('dark');
}

themeToggleBtn.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    if (document.documentElement.classList.contains('dark')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
});

// Counter Animation Dashboard
const counters = document.querySelectorAll('.counter');
counters.forEach(counter => {
    const target = +counter.getAttribute('data-target');
    const speed = 100;
    const updateCount = () => {
        const value = +counter.innerText;
        const inc = target / speed;
        if (value < target) {
            counter.innerText = Math.ceil(value + inc);
            setTimeout(updateCount, 15);
        } else {
            counter.innerText = target.toLocaleString('id-ID');
        }
    };
    updateCount();
});

// GSAP Floating Effect for Hero Element
gsap.to(".group", {
    y: 15,
    duration: 2.5,
    repeat: -1,
    yoyo: true,
    ease: "power1.inOut"
});

// Chart.js Configuration
const ctxSampah = document.getElementById('chartSampah')?.getContext('2d');
if (ctxSampah) {
    new Chart(ctxSampah, {
        type: 'bar',
        data: {
            labels: ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'],
            datasets: [{
                label: 'Berat Sampah (Kg)',
                data: [1200, 1900, 1500, 2100],
                backgroundColor: '#2E7D32',
                borderRadius: 8
            }]
        },
        options: { responsive: true }
    });
}

const ctxKas = document.getElementById('chartKas')?.getContext('2d');
if (ctxKas) {
    new Chart(ctxKas, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
            datasets: [
                { label: 'Pemasukan', data: [5, 7, 6, 8, 5, 9], borderColor: '#2E7D32', tension: 0.4 },
                { label: 'Pengeluaran', data: [3, 4, 3, 5, 4, 6], borderColor: '#FBC02D', tension: 0.4 }
            ]
        },
        options: { responsive: true }
    });
}
