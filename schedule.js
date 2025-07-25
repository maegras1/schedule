
document.addEventListener('DOMContentLoaded', () => {
    // WAŻNE: Wklej tutaj nowy URL wdrożonej aplikacji Google Apps Script
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw4rzpFdjbONE4lUU79ZnD8FD1l9Age9TgHKN6hPEItSyFW9cxc9U5FOWltjdlTZkMATg/exec';

    const loadingOverlay = document.getElementById('loadingOverlay');
    const mainTable = document.getElementById('mainScheduleTable');
    const tableHeaderRow = document.getElementById('tableHeaderRow');
    const tbody = mainTable.querySelector('tbody');
    const contextMenu = document.getElementById('contextMenu');
    const undoButton = document.getElementById('undoButton');
    const searchInput = document.getElementById('searchInput');
    const clearSearchButton = document.getElementById('clearSearchButton');

    // ... (reszta kodu bez zmian)

    // --- Data Sync with Google Apps Script ---

    const loadSchedule = async () => {
        try {
            const response = await fetch(WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'loadSchedule' })
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const savedData = await response.json();

            if (savedData.status === "error") {
                 throw new Error(savedData.message);
            }

            const dataToApply = savedData || { employeeHeaders: {}, scheduleCells: {} };
             
            document.querySelectorAll('th.editable-header').forEach(th => {
                const index = th.getAttribute('data-employee-index');
                if (dataToApply.employeeHeaders && dataToApply.employeeHeaders[index]) {
                    th.textContent = capitalizeFirstLetter(dataToApply.employeeHeaders[index]);
                }
            });

            document.querySelectorAll('td.editable-cell').forEach(cell => {
                const time = cell.getAttribute('data-time');
                const employeeIndex = cell.getAttribute('data-employee-index');
                const cellData = dataToApply.scheduleCells?.[time]?.[employeeIndex];
                if (cellData) {
                    applyCellDataToDom(cell, cellData);
                } else {
                    cell.className = 'editable-cell';
                    cell.innerHTML = '';
                    cell.style.backgroundColor = DEFAULT_CELL_COLOR;
                }
            });
            refreshAllRowHeights();
             
        } catch (error) {
            console.error('Błąd podczas ładowania danych:', error);
            window.showToast(`Błąd ładowania: ${error.message}`, 5000);
        }
    };

    const saveSchedule = async () => {
        const scheduleData = {
            employeeHeaders: {},
            scheduleCells: {}
        };

        document.querySelectorAll('th[data-employee-index]').forEach(th => {
            scheduleData.employeeHeaders[th.dataset.employeeIndex] = th.textContent;
        });

        document.querySelectorAll('td[data-time]').forEach(cell => {
            const time = cell.dataset.time;
            const employeeIndex = cell.dataset.employeeIndex;
            if (!scheduleData.scheduleCells[time]) scheduleData.scheduleCells[time] = {};
            scheduleData.scheduleCells[time][employeeIndex] = getCurrentTableStateForCell(cell);
        });

        try {
            const response = await fetch(WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'saveSchedule', payload: scheduleData })
            });

            if (!response.ok) {
                 const errorText = await response.text();
                 throw new Error(`HTTP error! status: ${response.status}, text: ${errorText}`);
            }

            const result = await response.json();

            if (result.status === "success") {
                 window.showToast('Zapisano!', 2000);
            } else {
                 throw new Error(result.message || 'Nieznany błąd zapisu.');
            }
        } catch (error) {
            console.error('Błąd podczas zapisywania danych:', error);
            window.showToast(`Błąd zapisu: ${error.message}`, 5000);
        }
    };

    // ... (reszta kodu bez zmian)
    
    const init = async () => {
        if (!WEB_APP_URL) {
            loadingOverlay.innerHTML = '<div class="toast-message error">Błąd: Brak konfiguracji WEB_APP_URL w schedule.js</div>';
            return;
        }
        generateScheduleTable();
        await loadSchedule();
        pushStateToUndoStack(); // Push initial state
        updateUndoRedoButtons();
        loadingOverlay.classList.add('hidden');
    };

    init();
});
