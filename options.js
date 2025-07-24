// Stała przechowująca URL aplikacji webowej Google
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbx_R4VPMsox2a_g36e-j_F-9RF7o_h3hjrHk2HqJv6itE2z2oM2Lh3aCI_U9yC0G235/exec';

/**
 * Obsługuje logikę kliknięcia przycisku dodawania nowego pracownika.
 */
function handleAddEmployee() {
    const newEmployeeNameInput = document.getElementById('newEmployeeName');
    const employeeName = newEmployeeNameInput.value.trim();

    if (!employeeName) {
        alert('Proszę wpisać imię i nazwisko pracownika.');
        return;
    }

    // Wyświetla komunikat o tym, co powinno się wydarzyć.
    // Docelowo ten fragment zostanie zastąpiony przez prawdziwe wywołanie API.
    alert(`Logika dodawania pracownika: "${employeeName}".
Implementacja fetch jest zakomentowana, ale gotowa do użycia.`);

    /*
    // TODO: Odkomentuj i dostosuj, gdy backend będzie gotowy.
    showLoading('Dodawanie pracownika...');

    fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addEmployee', name: employeeName })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('Pracownik dodany pomyślnie!');
            newEmployeeNameInput.value = '';
            loadAndDisplayEmployees(); // Odśwież listę
        } else {
            throw new Error(data.message || 'Nieznany błąd serwera.');
        }
    })
    .catch(error => {
        console.error('Błąd podczas dodawania pracownika:', error);
        alert(`Wystąpił błąd: ${error.message}`);
    })
    .finally(() => {
        hideLoading();
    });
    */
}

/**
 * Wczytuje i wyświetla listę pracowników.
 * (Funkcja do zaimplementowania w przyszłości)
 */
function loadAndDisplayEmployees() {
    console.log("Funkcja 'loadAndDisplayEmployees' została wywołana, ale jest pusta. Należy ją zaimplementować.");
    
    // TODO: Zaimplementuj wczytywanie i wyświetlanie pracowników.
    /*
    showLoading('Wczytywanie listy...');
    fetch(`${WEB_APP_URL}?action=getEmployees`)
        .then(response => response.json())
        .then(data => {
            if (data && data.employees) {
                const employeeListDiv = document.getElementById('employeeList');
                employeeListDiv.innerHTML = ''; // Wyczyść listę przed dodaniem nowych
                data.employees.forEach(employee => {
                    const employeeElement = document.createElement('div');
                    employeeElement.textContent = employee.name;
                    // Można dodać przyciski do edycji/usuwania
                    employeeListDiv.appendChild(employeeElement);
                });
            }
        })
        .catch(error => {
            console.error('Błąd podczas wczytywania pracowników:', error);
            alert('Nie udało się wczytać listy pracowników.');
        })
        .finally(() => {
            hideLoading();
        });
    */
}


/**
 * Główna funkcja inicjalizująca po załadowaniu DOM.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Ukryj nakładkę ładowania, ponieważ na tej stronie nie ma początkowego ładowania danych
    hideLoading(true);

    const addEmployeeButton = document.getElementById('addEmployeeButton');
    if (addEmployeeButton) {
        addEmployeeButton.addEventListener('click', handleAddEmployee);
    }

    // Wczytaj listę pracowników (gdy funkcja zostanie zaimplementowana)
    loadAndDisplayEmployees();
});

// Pomocnicze funkcje do pokazywania/ukrywania ładowania
// (zakładamy, że są one zdefiniowane w shared.js)
function showLoading(message = 'Wczytywanie...') {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        const textElement = overlay.querySelector('p');
        if (textElement) textElement.textContent = message;
        overlay.classList.remove('hidden');
    }
}

function hideLoading(instant = false) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        if (instant) {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        } else {
            overlay.classList.add('hidden');
            setTimeout(() => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 300);
        }
    }
}
