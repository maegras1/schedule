
document.addEventListener('DOMContentLoaded', () => {
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw4rzpFdjbONE4lUU79ZnD8FD1l9Age9TgHKN6hPEItSyFW9cxc9U5FOWltjdlTZkMATg/exec';

    // ... (reszta kodu bez zmian)

    const getEmployeeNames = async () => {
        try {
            const response = await fetch(WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getEmployees' })
            });
            if (!response.ok) throw new Error(`Błąd HTTP: ${response.status}`);
            const employeeNames = await response.json();
            if (employeeNames && employeeNames.length > 0) {
                return employeeNames;
            }
            throw new Error('Brak zapisanych nagłówków pracowników.');
        } catch (error) {
            console.error('Nie udało się pobrać nazwisk pracowników:', error);
            window.showToast(`Błąd pobierania pracowników: ${error.message}`, 5000);
            let fallbackNames = [];
            for (let i = 0; i < 13; i++) {
                fallbackNames.push(`Pracownik ${i + 1}`);
            }
            return fallbackNames;
        }
    };

    const saveLeavesData = async () => {
        const leavesData = {};
        document.querySelectorAll('#leavesTableBody tr').forEach(row => {
            const employeeName = row.cells[0].textContent;
            leavesData[employeeName] = {};
            Array.from(row.cells).slice(1).forEach((cell, index) => {
                 leavesData[employeeName][index] = cell.textContent.trim();
            });
        });

        try {
            const response = await fetch(WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'saveLeaves', payload: leavesData })
            });
             const result = await response.json();
             if (result.status === "success") {
                 window.showToast('Zapisano urlopy!', 2000);
             } else {
                throw new Error(result.message || "Nieznany błąd zapisu urlopów.");
             }
        } catch (error) {
            console.error('Błąd zapisu urlopów:', error);
            window.showToast(`Błąd zapisu urlopów: ${error.message}`, 5000);
        }
    };
    
    // ... (reszta kodu bez zmian)
});
