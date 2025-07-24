document.addEventListener('DOMContentLoaded', () => {
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzu0mPeOZvjxnTJmvELkRdYMqFjxnhJHUdHbYJHojO06m9im_eoqQOQ3UzKtdgK8VPq6Q/exec';

    const loadingOverlay = document.getElementById('loadingOverlay');
    const mainTable = document.getElementById('mainScheduleTable');
    const tableHeaderRow = document.getElementById('headerRow'); // Zmieniono ID
    const tbody = mainTable.querySelector('tbody');
    const contextMenu = document.getElementById('contextMenu');
    const undoButton = document.getElementById('undoButton'); // Załóżmy, że istnieje przycisk cofania
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');


    // Context Menu Options - zakładając, że istnieją w HTML
    const contextSplitCell = document.getElementById('ctx-split');
    const contextAddBreak = document.getElementById('ctx-add-break');
    const contextClear = document.getElementById('ctx-clear');
    const contextRemoveBreak = document.getElementById('ctx-remove-break');
    const contextMassage = document.getElementById('ctx-massage'); // Dodano
    const contextPnf = document.getElementById('ctx-pnf'); // Dodano

    let currentCell = null;
    let draggedCell = null;
    let activeCell = null;
    const undoStack = [];
    const redoStack = [];
    const MAX_UNDO_STATES = 20;
    const NUMBER_OF_EMPLOYEES = 13;
    const START_HOUR = 7;
    const END_HOUR = 17;
    const DEFAULT_CELL_COLOR = '#e0e0e0';
    const CONTENT_CELL_COLOR = '#ffffff';
    const BREAK_TEXT = 'Przerwa';

    // --- FUNKCJE POMOCNICZE ---
    const capitalizeFirstLetter = (string) => {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    };
    
    const getElementText = (element) => {
        if (!element) return '';
        return element.textContent.trim();
    };


    // --- WYSZUKIWANIE I FILTROWANIE ---

    const highlightText = (element, searchTerm) => {
        const originalText = getElementText(element);
        if (searchTerm === '' || !originalText) {
            element.innerHTML = `<span>${originalText}</span>`; // Przywróć <SPAN>
            return;
        }
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        element.innerHTML = originalText.replace(regex, `<span class="search-highlight">$1</span>`);
    };


    const filterTable = () => {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const rows = tbody.getElementsByTagName('tr');
        const headerCells = tableHeaderRow.getElementsByTagName('th');
        const visibleColumns = new Array(headerCells.length).fill(false);
        visibleColumns[0] = true; // Zawsze widoczna kolumna z godziną

        // Krok 1: Sprawdź, które kolumny (pracownicy) pasują do wyszukiwania
        for (let i = 1; i < headerCells.length; i++) {
            const header = headerCells[i];
            const headerText = getElementText(header).toLowerCase();
            if (headerText.includes(searchTerm)) {
                visibleColumns[i] = true;
            }
             highlightText(header, searchTerm);
        }

        // Krok 2: Sprawdź komórki w ciele tabeli i oznacz kolumny jako widoczne, jeśli jest dopasowanie
        if(searchTerm) { // Tylko jeśli jest co wyszukiwać
            for (const row of rows) {
                const cells = row.getElementsByTagName('td');
                for (let i = 1; i < cells.length; i++) {
                    const cell = cells[i];
                    const cellText = getElementText(cell).toLowerCase();
                    if (cellText.includes(searchTerm)) {
                        visibleColumns[i] = true;
                    }
                }
            }
        } else { // Jeśli pole wyszukiwania jest puste, pokaż wszystko
             for (let i = 1; i < headerCells.length; i++) {
                visibleColumns[i] = true;
            }
        }


        // Krok 3: Zastosuj widoczność i podświetlenie
        for (let i = 0; i < headerCells.length; i++) {
            headerCells[i].style.display = visibleColumns[i] ? '' : 'none';
        }

        for (const row of rows) {
            let rowHasVisibleContent = false;
            const cells = row.getElementsByTagName('td');
            for (let i = 0; i < cells.length; i++) {
                const cell = cells[i];
                cell.style.display = visibleColumns[i] ? '' : 'none';
                if(visibleColumns[i]) {
                    highlightText(cell, searchTerm);
                     if (i > 0 && getElementText(cell) !== '') {
                        rowHasVisibleContent = true;
                    }
                }
            }
             // Pokaż wiersz, jeśli ma jakąkolwiek treść w widocznych kolumnach (lub jeśli wyszukiwanie jest puste)
            row.style.display = (rowHasVisibleContent || searchTerm === '') ? '' : 'none';
        }
    };

    searchInput.addEventListener('input', () => {
        filterTable();
        clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        filterTable();
        clearSearchBtn.style.display = 'none';
    });


    // --- GENEROWANIE TABELI ---
    const generateScheduleTable = () => {
        tableHeaderRow.innerHTML = '<th>Godz.</th>';
        tbody.innerHTML = '';

        for (let i = 0; i < NUMBER_OF_EMPLOYEES; i++) {
            const th = document.createElement('th');
            th.innerHTML = `<span>Pracownik ${i + 1}</span>`; // Opakuj w SPAN
            th.classList.add('editable-header');
            th.dataset.employeeIndex = i;
            th.tabIndex = 0;
            tableHeaderRow.appendChild(th);
        }

        for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                if (hour === END_HOUR && minute === 30) continue;
                const tr = tbody.insertRow();
                const timeCell = tr.insertCell();
                timeCell.innerHTML = `<span>${hour}:${minute.toString().padStart(2, '0')}</span>`; // Opakuj w SPAN
                for (let i = 0; i < NUMBER_OF_EMPLOYEES; i++) {
                    const cell = tr.insertCell();
                    cell.classList.add('editable-cell');
                    cell.dataset.time = `${hour}:${minute.toString().padStart(2, '0')}`;
                    cell.dataset.employeeIndex = i;
                    cell.draggable = true;
                    cell.tabIndex = 0;
                    cell.innerHTML = '<span></span>'; // Opakuj w SPAN
                }
            }
        }
    };
    
        // --- ZAPIS I WCZYTYWANIE DANYCH (fragmenty, bez zmian w logice) ---
    const applyCellDataToDom = (cell, cellObj) => {
        // Ta funkcja musi teraz operować na wewnętrznym spanie
        cell.className = 'editable-cell';
        delete cell.dataset.isMassage;
        delete cell.dataset.isPnf;

        let contentSpan = cell.querySelector('span');
        if (!contentSpan) {
            contentSpan = document.createElement('span');
            cell.innerHTML = '';
            cell.appendChild(contentSpan);
        }

        if (cellObj.isBreak) {
            contentSpan.textContent = BREAK_TEXT;
            cell.classList.add('break-cell');
            cell.style.backgroundColor = '';
        } else {
            contentSpan.textContent = capitalizeFirstLetter(cellObj.content || '');
             if (cellObj.isMassage) cell.classList.add('massage-text');
             if (cellObj.isPnf) cell.classList.add('pnf-text');
            cell.style.backgroundColor = (getElementText(cell).trim() !== '') ? CONTENT_CELL_COLOR : DEFAULT_CELL_COLOR;
        }
    };
    
    const loadSchedule = async () => {
        loadingOverlay.style.display = 'flex';
        try {
            const response = await fetch(WEB_APP_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const savedData = await response.json() || {};
            
            document.querySelectorAll('th.editable-header').forEach(th => {
                 const index = th.dataset.employeeIndex;
                 if (savedData.employeeHeaders && savedData.employeeHeaders[index]) {
                    th.querySelector('span').textContent = capitalizeFirstLetter(savedData.employeeHeaders[index]);
                }
            });

            document.querySelectorAll('td.editable-cell').forEach(cell => {
                const time = cell.dataset.time;
                const employeeIndex = cell.dataset.employeeIndex;
                const cellData = savedData.scheduleCells?.[time]?.[employeeIndex];
                 if (cellData) {
                    applyCellDataToDom(cell, cellData);
                } else {
                    applyCellDataToDom(cell, {}); // Wyczyść komórkę
                }
            });
        } catch (error) {
            console.error('Błąd podczas ładowania danych:', error);
            // Pokaż błąd użytkownikowi
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    };

    // Reszta kodu (obsługa edycji, menu kontekstowe, przeciąganie i upuszczanie, etc.)
    // powinna pozostać w większości bez zmian, ale może wymagać dostosowania
    // selektorów, aby odwoływały się do wewnętrznych spanów, jeśli to konieczne
    // dla funkcji `getElementText` i `highlightText`.

    // --- INICJALIZACJA ---
    const init = async () => {
        generateScheduleTable();
        await loadSchedule();
        // pushStateToUndoStack(); // Zapisz stan początkowy
        // updateUndoRedoButtons();
        loadingOverlay.classList.add('hidden');
    };

    init();
});