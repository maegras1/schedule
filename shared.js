document.addEventListener('DOMContentLoaded', () => {
    const navbarContainer = document.getElementById('navbar-container');
    const dateTimeText = document.getElementById('dateTimeText');

    // Function to update the date and time in the header
    const updateDateTimeHeader = () => {
        if (!dateTimeText) return;
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        dateTimeText.textContent = now.toLocaleDateString('pl-PL', options);
    };

    // --- Dynamic Navigation ---
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


    // --- "Toast" Notification System ---
    window.showToast = (message, duration = 3000) => {
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = 'toast show';
        toast.textContent = message;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode === toastContainer) {
                   toastContainer.removeChild(toast);
                }
            }, 500);
        }, duration);
    };


    // Initialization
    generateNavbar();
    setInterval(updateDateTimeHeader, 1000);
    updateDateTimeHeader();
});
