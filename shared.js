document.addEventListener('DOMContentLoaded', () => {
    // Adres URL Twojej wdrożonej aplikacji internetowej Google Apps Script
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzu0mPeOZvjxnTJmvELkRdYMqFjxnhJHUdHbYJHojO06m9im_eoqQOQ3UzKtdgK8VPq6Q/exec';

    const dateTimeText = document.getElementById('dateTimeText');
    const navbarContainer = document.getElementById('navbar-container');

    // Funkcja aktualizująca datę i czas w nagłówku
    const updateDateTimeHeader = () => {
        if (!dateTimeText) return;
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        dateTimeText.textContent = now.toLocaleDateString('pl-PL', options);
    };

    // --- NOWOŚĆ: Dynamiczna nawigacja ---
    const generateNavbar = () => {
        if (!navbarContainer) return;

        const navLinks = [
            { href: 'schedule.html', text: 'Grafik' },
            { href: 'leaves.html', text: 'Urlopy' },
            { href: 'options.html', text: 'Opcje' }
        ];

        const currentPage = window.location.pathname.split('/').pop();

        const navHTML = `
            <nav class="navbar">
                <ul>
                    ${navLinks.map(link => `
                        <li>
                            <a href="${link.href}" class="${currentPage === link.href ? 'active' : ''}">
                                ${link.text}
                            </a>
                        </li>
                    `).join('')}
                </ul>
            </nav>
        `;
        navbarContainer.innerHTML = navHTML;
    };


    // --- NOWOŚĆ: System powiadomień "Toast" ---
    window.showToast = (message, duration = 3000) => {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            console.error('Toast container not found!');
            return;
        }

        const toast = document.createElement('div');
        toast.className = 'toast show';
        toast.textContent = message;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toastContainer.removeChild(toast);
            }, 500); // Czas na animację zniknięcia
        }, duration);
    };


    // Inicjalizacja
    generateNavbar();
    setInterval(updateDateTimeHeader, 1000);
    updateDateTimeHeader();
});
