// --- STAŁE I ZMIENNE GLOBALNE ---
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbx_R4VPMsox2a_g36e-j_F-9RF7o_h3hjrHk2HqJv6itE2z2oM2Lh3aCI_U9yC0G235/exec';
const MONTHS = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

// Zmienne stanu aplikacji
let activeCell = null;
let calendarDate = new Date();
let selectedDays = [];
let lastSelectedDay = null;

// --- GŁÓWNA INICJALIZACJA APLIKACJI ---

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

/**
 * Główna funkcja inicjalizująca aplikację.
 */
async function initializeApp() {
    showLoading('Inicjalizacja...');
    setupEventListeners();
    try {
        await generateFullLeaveTable();
    } catch (error) {
        console.error("Błąd podczas inicjalizacji tabeli urlopów:", error);
        showToast('Nie udało się wczytać danych o urlopach.', 'error');
    } finally {
        hideLoading();
    }
}

// --- POBIERANIE I ZAPISYWANIE DANYCH ---

/**
 * Pobiera dane o urlopach i nazwy pracowników z serwera.
 */
async function getLeaveData() {
    try {
        // Zakładamy, że endpoint zwraca zarówno pracowników, jak i dane o urlopach
        const response = await fetch(`${WEB_APP_URL}?action=getLeaves`);
        if (!response.ok) {
            throw new Error(`Błąd HTTP: ${response.status}`);
        }
        const data = await response.json();
        if (!data || !data.employees) {
            throw new Error('Otrzymano nieprawidłowe dane z serwera.');
        }
        return data;
    } catch (error) {
        console.error('Nie udało się pobrać danych o urlopach:', error);
        // Zwróć dane awaryjne w przypadku błędu
        return {
            employees: Array.from({ length: 10 }, (_, i) => ({ name: `Pracownik ${i + 1}` })),
            leaves: {}
        };
    }
}

/**
 * Zapisuje wszystkie dane o urlopach na serwerze.
 */
async function saveLeavesData() {
    showLoading('Zapisywanie zmian...');
    const leavesData = {};
    document.querySelectorAll('#leavesTableBody tr').forEach(row => {
        const employeeName = row.cells[0].textContent;
        const employeeLeaves = {};
        Array.from(row.cells).slice(1).forEach((cell, index) => {
            const monthIndex = cell.dataset.month;
            const leaveInfo = cell.textContent.trim();
            if (leaveInfo) {
                employeeLeaves[monthIndex] = leaveInfo;
            }
        });
        if (Object.keys(employeeLeaves).length > 0) {
            leavesData[employeeName] = employeeLeaves;
        }
    });

    console.log("Dane do zapisu:", leavesData);
    alert("Logika zapisu urlopów. Implementacja fetch jest zakomentowana, ale gotowa do użycia.");

    /*
    // TODO: Odkomentuj, gdy backend będzie gotowy.
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'saveLeaves', data: leavesData })
        });
        const result = await response.json();
        if (result.success) {
            showToast('Urlopy zostały pomyślnie zapisane!');
        } else {
            throw new Error(result.message || 'Nieznany błąd zapisu.');
        }
    } catch (error) {
        console.error('Błąd podczas zapisywania urlopów:', error);
        showToast(`Błąd zapisu: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
    */
   hideLoading(); // Usunąć, gdy fetch zostanie odkomentowany
}


// --- GENEROWANIE TABELI ---

/**
 * Generuje nagłówki i całą zawartość tabeli urlopów.
 */
async function generateFullLeaveTable() {
    const leavesHeaderRow = document.getElementById('leavesHeaderRow');
    const leavesTableBody = document.getElementById('leavesTableBody');

    // Generuj nagłówki
    leavesHeaderRow.innerHTML = '<th>Pracownik</th>';
    MONTHS.forEach(month => {
        const th = document.createElement('th');
        th.textContent = month;
        leavesHeaderRow.appendChild(th);
    });

    // Pobierz dane i generuj wiersze
    const { employees, leaves } = await getLeaveData();
    leavesTableBody.innerHTML = ''; // Wyczyść istniejące dane

    employees.forEach(employee => {
        if (!employee || !employee.name) return;
        const tr = document.createElement('tr');
        
        const nameTd = document.createElement('td');
        nameTd.textContent = employee.name;
        nameTd.classList.add('employee-name-cell');
        tr.appendChild(nameTd);

        const employeeLeaves = leaves[employee.name] || {};

        MONTHS.forEach((_, monthIndex) => {
            const monthTd = document.createElement('td');
            monthTd.classList.add('day-cell');
            monthTd.dataset.employee = employee.name;
            monthTd.dataset.month = monthIndex;
            monthTd.textContent = employeeLeaves[monthIndex] || '';
            if (monthTd.textContent) {
                monthTd.classList.add('on-leave');
            }
            tr.appendChild(monthTd);
        });
        leavesTableBody.appendChild(tr);
    });
}


// --- LOGIKA MODALU I KALENDARZA ---

/**
 * Otwiera modal z kalendarzem dla wybranej komórki.
 * @param {HTMLElement} cell - Komórka tabeli, która została kliknięta.
 */
function openModal(cell) {
    activeCell = cell;
    const monthIndex = parseInt(cell.dataset.month, 10);
    const year = new Date().getFullYear();
    
    selectedDays = parseDaysFromString(activeCell.textContent);
    lastSelectedDay = null;
    
    calendarDate = new Date(year, monthIndex);
    generateCalendar();
    
    document.getElementById('calendarModal').style.display = 'flex';
}

/**
 * Zamyka modal kalendarza.
 */
function closeModal() {
    document.getElementById('calendarModal').style.display = 'none';
    activeCell = null;
    selectedDays = [];
}

/**
 * Generuje widok kalendarza dla aktualnie wybranego miesiąca i roku.
 */
function generateCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const monthAndYear = document.getElementById('monthAndYear');
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    calendarGrid.innerHTML = `
        <div class="day-name">Pn</div><div class="day-name">Wt</div><div class="day-name">Śr</div>
        <div class="day-name">Cz</div><div class="day-name">Pt</div><div class="day-name">So</div>
        <div class="day-name">Nd</div>`;
    monthAndYear.textContent = `${MONTHS[month]} ${year}`;

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startingDay = (firstDayOfMonth === 0) ? 6 : firstDayOfMonth - 1;

    for (let i = 0; i < startingDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.classList.add('day-cell-calendar', 'empty');
        calendarGrid.appendChild(emptyCell);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dayCell = document.createElement('div');
        dayCell.classList.add('day-cell-calendar');
        dayCell.textContent = i;
        dayCell.dataset.day = i;
        if (selectedDays.includes(i)) {
            dayCell.classList.add('selected');
        }
        calendarGrid.appendChild(dayCell);
    }
}


// --- OBSŁUGA ZDARZEŃ (EVENT LISTENERS) ---

function setupEventListeners() {
    const leavesTableBody = document.getElementById('leavesTableBody');
    const calendarGrid = document.getElementById('calendarGrid');
    const modal = document.getElementById('calendarModal');

    // Kliknięcie na komórkę urlopu
    leavesTableBody.addEventListener('click', (event) => {
        if (event.target.classList.contains('day-cell')) {
            openModal(event.target);
        }
    });

    // Kliknięcie na dzień w kalendarzu
    calendarGrid.addEventListener('click', (event) => {
        const target = event.target;
        if (!target.classList.contains('day-cell-calendar') || target.classList.contains('empty')) return;
        
        const day = parseInt(target.dataset.day, 10);
        target.classList.toggle('selected');

        if (event.shiftKey && lastSelectedDay !== null) {
            const start = Math.min(day, lastSelectedDay);
            const end = Math.max(day, lastSelectedDay);
            const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
            // Dodaj tylko te dni, których jeszcze nie ma
            range.forEach(d => {
                if (!selectedDays.includes(d)) selectedDays.push(d);
            });
        } else {
            if (selectedDays.includes(day)) {
                selectedDays = selectedDays.filter(d => d !== day);
            } else {
                selectedDays.push(day);
            }
        }
        lastSelectedDay = day;
        generateCalendar(); // Przerenderuj kalendarz, aby pokazać zmiany
    });

    // Nawigacja kalendarza
    document.getElementById('prevMonthBtn').addEventListener('click', () => {
        calendarDate.setMonth(calendarDate.getMonth() - 1);
        generateCalendar();
    });
    document.getElementById('nextMonthBtn').addEventListener('click', () => {
        calendarDate.setMonth(calendarDate.getMonth() + 1);
        generateCalendar();
    });

    // Przyciski modala
    document.getElementById('confirmSelectionBtn').addEventListener('click', () => {
        if (activeCell) {
            const leaveString = formatDaysToString(selectedDays);
            activeCell.textContent = leaveString;
            activeCell.classList.toggle('on-leave', !!leaveString);
            saveLeavesData(); // Zapisz zmiany
        }
        closeModal();
    });
    document.getElementById('cancelSelectionBtn').addEventListener('click', closeModal);

    // Zamykanie modala przez kliknięcie tła
    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });

    // Wyszukiwarka
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearch');
    
    searchInput.addEventListener('input', (event) => {
        const searchTerm = event.target.value;
        filterTable(searchTerm);
        clearSearchBtn.style.display = searchTerm ? 'inline' : 'none';
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        filterTable('');
        clearSearchBtn.style.display = 'none';
    });
}


// --- FUNKCJE POMOCNICZE ---

/**
 * Filtruje tabelę na podstawie wprowadzonego terminu.
 * @param {string} searchTerm - Termin do wyszukania.
 */
function filterTable(searchTerm) {
    const rows = document.querySelectorAll('#leavesTableBody tr');
    const term = searchTerm.toLowerCase();

    rows.forEach(row => {
        const employeeName = row.cells[0].textContent.toLowerCase();
        const rowContent = Array.from(row.cells).slice(1).map(cell => cell.textContent).join(' ').toLowerCase();
        
        const isVisible = employeeName.includes(term) || rowContent.includes(term);
        row.style.display = isVisible ? '' : 'none';
    });
}

/**
 * Konwertuje ciąg znaków (np. "1-3, 5") na tablicę liczb.
 * @param {string} str - Ciąg znaków do przetworzenia.
 * @returns {number[]} Tablica dni.
 */
function parseDaysFromString(str) {
    if (!str) return [];
    const days = new Set();
    str.split(',').forEach(part => {
        const trimmedPart = part.trim();
        if (trimmedPart.includes('-')) {
            const [start, end] = trimmedPart.split('-').map(Number);
            for (let i = start; i <= end; i++) days.add(i);
        } else if (trimmedPart) {
            days.add(Number(trimmedPart));
        }
    });
    return Array.from(days).sort((a, b) => a - b);
}

/**
 * Konwertuje tablicę liczb na sformatowany ciąg znaków (np. "1-3, 5").
 * @param {number[]} days - Tablica dni do sformatowania.
 * @returns {string} Sformatowany ciąg znaków.
 */
function formatDaysToString(days) {
    if (days.length === 0) return '';
    days.sort((a, b) => a - b);
    const ranges = [];
    let start = days[0];
    let end = days[0];
    for (let i = 1; i < days.length; i++) {
        if (days[i] === end + 1) {
            end = days[i];
        } else {
            ranges.push(start === end ? `${start}` : `${start}-${end}`);
            start = end = days[i];
        }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    return ranges.join(', ');
}

// Proste funkcje do pokazywania/ukrywania ładowania i toastów (mogą być w shared.js)
function showLoading(message = 'Wczytywanie...') {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.querySelector('p').textContent = message;
        overlay.classList.remove('hidden');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (container) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 5000);
    } else {
        alert(message);
    }
}