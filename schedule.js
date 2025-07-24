// =================================================================================
// SCHEDULE.JS - GŁÓWNY PLIK LOGIKI DLA GRAFIKU
// =================================================================================

// --- KONFIGURACJA I STAŁE ---
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbx_R4VPMsox2a_g36e-j_F-9RF7o_h3hjrHk2HqJv6itE2z2oM2Lh3aCI_U9yC0G235/exec';
const NUMBER_OF_EMPLOYEES = 13;
const START_HOUR = 7;
const END_HOUR = 17;
const MAX_UNDO_STATES = 30;
const BREAK_TEXT = 'Przerwa';
const DEFAULT_CELL_COLOR = '#e0e0e0';
const CONTENT_CELL_COLOR = '#ffffff';

// --- ZMIENNE STANU APLIKACJI ---
let activeElement = null; // Aktualnie zaznaczony element (TD, TH, DIV)
let draggedCell = null;   // Komórka TD przeciągana przez użytkownika
const undoStack = [];
const redoStack = []; // Na razie nieużywane, ale gotowe do implementacji

// --- GŁÓWNA INICJALIZACJA ---

document.addEventListener('DOMContentLoaded', initializeSchedule);

async function initializeSchedule() {
    showLoading('Generowanie grafiku...');
    renderScheduleTableStructure();
    
    showLoading('Wczytywanie danych...');
    try {
        const initialState = await fetchData();
        applyStateToTable(initialState);
        pushToUndoStack(initialState);
    } catch (error) {
        console.error('Błąd krytyczny podczas inicjalizacji:', error);
        showToast('Nie udało się wczytać grafiku. Spróbuj odświeżyć stronę.', 'error');
    } finally {
        setupAllEventListeners();
        updateUndoButton();
        hideLoading();
    }
}

// =================================================================================
// SEKCJA: POBIERANIE I ZAPISYWANIE DANYCH (API + UNDO/REDO)
// =================================================================================

async function fetchData() {
    try {
        const response = await fetch(WEB_APP_URL);
        if (!response.ok) throw new Error(`Błąd HTTP: ${response.status}`);
        const data = await response.json();
        return {
            employeeHeaders: data.employeeHeaders || {},
            scheduleCells: data.scheduleCells || {}
        };
    } catch (error) {
        console.error('Błąd podczas ładowania danych:', error);
        throw error;
    }
}

async function saveData() {
    const currentState = getTableState();
    showToast('Zapisywanie...');
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentState)
        });
        if (!response.ok) throw new Error(`Błąd HTTP: ${response.status}`);
        await response.json();
        showToast('Grafik zapisany!', 'success');
    } catch (error) {
        console.error('Błąd podczas zapisywania danych:', error);
        showToast('Błąd zapisu.', 'error');
    }
}

function pushToUndoStack(state) {
    if (undoStack.length > 0 && JSON.stringify(undoStack[undoStack.length - 1]) === JSON.stringify(state)) return;
    undoStack.push(state);
    if (undoStack.length > MAX_UNDO_STATES) undoStack.shift();
    redoStack.length = 0;
    updateUndoButton();
}

function undoLastAction() {
    if (undoStack.length <= 1) return;
    const currentState = undoStack.pop();
    redoStack.push(currentState);
    const prevState = undoStack[undoStack.length - 1];
    applyStateToTable(prevState);
    saveData();
    updateUndoButton();
}

function updateUndoButton() {
    const undoButton = document.getElementById('undoButton');
    if (undoButton) undoButton.disabled = undoStack.length <= 1;
}

// =================================================================================
// SEKCJA: MANIPULACJA STANEM TABELI
// =================================================================================

function getTableState() {
    const state = { employeeHeaders: {}, scheduleCells: {} };
    document.querySelectorAll('th[data-employee-index]').forEach(th => {
        state.employeeHeaders[th.dataset.employeeIndex] = th.textContent;
    });
    document.querySelectorAll('td.editable-cell').forEach(cell => {
        const time = cell.dataset.time;
        const employeeIndex = cell.dataset.employeeIndex;
        if (!state.scheduleCells[time]) state.scheduleCells[time] = {};
        state.scheduleCells[time][employeeIndex] = getCellState(cell);
    });
    return state;
}

function getCellState(cell) {
    if (cell.classList.contains('break-cell')) return { isBreak: true };
    if (cell.classList.contains('split-cell')) {
        const p1 = cell.children[0], p2 = cell.children[1];
        return { isSplit: true, content1: p1?.textContent||'', isMassage1: p1?.dataset.isMassage==='true', isPnf1: p1?.dataset.isPnf==='true', content2: p2?.textContent||'', isMassage2: p2?.dataset.isMassage==='true', isPnf2: p2?.dataset.isPnf==='true' };
    }
    return { content: cell.textContent||'', isMassage: cell.dataset.isMassage==='true', isPnf: cell.dataset.isPnf==='true' };
}

function applyStateToTable(state) {
    document.querySelectorAll('th.editable-header').forEach(th => {
        const i = th.dataset.employeeIndex;
        th.textContent = state.employeeHeaders?.[i] || `Pracownik ${parseInt(i,10)+1}`;
    });
    document.querySelectorAll('td.editable-cell').forEach(cell => {
        const time = cell.dataset.time, i = cell.dataset.employeeIndex;
        applyCellState(cell, state.scheduleCells?.[time]?.[i] || {});
    });
    document.querySelectorAll('#mainScheduleTable tbody tr').forEach(r => r.style.height = 'auto');
}

function applyCellState(cell, state) {
    cell.className = 'editable-cell';
    cell.innerHTML = '';
    delete cell.dataset.isMassage;
    delete cell.dataset.isPnf;
    cell.setAttribute('draggable', 'true');
    cell.style.backgroundColor = '';

    if (state.isBreak) {
        cell.classList.add('break-cell');
        cell.textContent = BREAK_TEXT;
        cell.setAttribute('draggable', 'false');
    } else if (state.isSplit) {
        cell.classList.add('split-cell');
        const createPart = (content, isMassage, isPnf) => {
            const div = document.createElement('div');
            div.setAttribute('tabindex', '0');
            div.textContent = content || '';
            if (isMassage) div.dataset.isMassage = 'true';
            if (isPnf) div.dataset.isPnf = 'true';
            return div;
        };
        cell.appendChild(createPart(state.content1, state.isMassage1, state.isPnf1));
        cell.appendChild(createPart(state.content2, state.isMassage2, state.isPnf2));
    } else {
        cell.textContent = state.content || '';
        if (state.isMassage) cell.dataset.isMassage = 'true';
        if (state.isPnf) cell.dataset.isPnf = 'true';
    }
    if (!state.isBreak) cell.style.backgroundColor = (cell.textContent.trim()!=='') ? CONTENT_CELL_COLOR : DEFAULT_CELL_COLOR;
}

// =================================================================================
// SEKCJA: RENDEROWANIE I STRUKTURA TABELI
// =================================================================================

function renderScheduleTableStructure() {
    const header = document.getElementById('tableHeaderRow');
    const body = document.querySelector('#mainScheduleTable tbody');
    header.innerHTML = '<th>Godz.</th>';
    for (let i=0; i<NUMBER_OF_EMPLOYEES; i++) {
        const th = document.createElement('th');
        th.className = 'editable-header';
        th.dataset.employeeIndex = i;
        th.setAttribute('tabindex', '0');
        header.appendChild(th);
    }
    for (let h=START_HOUR; h<=END_HOUR; h++) {
        for (let m=0; m<60; m+=30) {
            if (h===END_HOUR && m===30) continue;
            const tr = body.insertRow();
            const time = `${h}:${String(m).padStart(2,'0')}`;
            tr.insertCell().textContent = time;
            for (let i=0; i<NUMBER_OF_EMPLOYEES; i++) {
                const cell = tr.insertCell();
                cell.className = 'editable-cell';
                cell.dataset.time = time;
                cell.dataset.employeeIndex = i;
                cell.setAttribute('tabindex', '0');
            }
        }
    }
}

// =================================================================================
// SEKCJA: OBSŁUGA ZDARZEŃ
// =================================================================================

function setupAllEventListeners() {
    const table = document.getElementById('mainScheduleTable');
    table.addEventListener('click', e => handleInteraction(e.target, 'click'));
    table.addEventListener('dblclick', e => handleInteraction(e.target, 'dblclick'));
    table.addEventListener('contextmenu', e => handleInteraction(e.target, 'contextmenu', e));
    document.addEventListener('click', e => { if (!table.contains(e.target)) handleInteraction(null, 'outside'); });
    
    table.addEventListener('dragstart', handleDragDrop);
    table.addEventListener('dragover', handleDragDrop);
    table.addEventListener('dragleave', handleDragDrop);
    table.addEventListener('drop', handleDragDrop);
    table.addEventListener('dragend', handleDragDrop);

    document.addEventListener('keydown', handleKeyboard);
    document.getElementById('undoButton').addEventListener('click', undoLastAction);
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', () => handleSearch(searchInput.value));
    document.getElementById('clearSearchButton').addEventListener('click', () => {
        searchInput.value = '';
        handleSearch('');
    });
}

function handleInteraction(target, type, event) {
    const element = target?.closest('td.editable-cell, th.editable-header, div[tabindex="0"]');

    if (activeElement?.isContentEditable) {
        if (element !== activeElement) exitEditMode(activeElement, true);
        return;
    }
    
    switch(type) {
        case 'click':
            setActiveElement(element);
            break;
        case 'dblclick':
            if (element) enterEditMode(element);
            break;
        case 'contextmenu':
            event.preventDefault();
            if (element?.closest('td')) showContextMenu(element.closest('td'), event);
            break;
        case 'outside':
            setActiveElement(null);
            hideContextMenu();
            break;
    }
}

function handleKeyboard(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undoLastAction(); return; }
    if (!activeElement) return;

    if (activeElement.isContentEditable) {
        if (e.key === 'Escape') exitEditMode(activeElement, false);
        if (e.key === 'Enter') { e.preventDefault(); exitEditMode(activeElement, true); }
        return;
    }

    if (e.key === 'Enter') { e.preventDefault(); enterEditMode(activeElement); return; }
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        enterEditMode(activeElement, true, e.key);
        return;
    }

    const move = (dx, dy) => {
        const parentCell = activeElement.closest('td, th');
        const currentRow = parentCell.closest('tr');
        const targetColIndex = parentCell.cellIndex + dx;
        let targetRow = currentRow;
        if (dy !== 0) {
            const a = Array.from(document.querySelectorAll('#mainScheduleTable tr'));
            const i = a.indexOf(currentRow) + dy;
            if (i > 0 && i < a.length) targetRow = a[i];
        }
        if (targetRow) {
            const targetCell = targetRow.cells[targetColIndex];
            if (targetCell?.matches('.editable-cell, .editable-header')) {
                setActiveElement(targetCell.querySelector('div') || targetCell);
            }
        }
    };
    
    const keyMap = { 'ArrowLeft': [-1,0], 'ArrowRight': [1,0], 'ArrowUp': [0,-1], 'ArrowDown': [0,1] };
    if (keyMap[e.key]) { e.preventDefault(); move(...keyMap[e.key]); }
}

function handleDragDrop(e) {
    const targetCell = e.target.closest('td.editable-cell');
    
    switch(e.type) {
        case 'dragstart':
            if (targetCell && !targetCell.classList.contains('break-cell')) {
                draggedCell = targetCell;
                e.dataTransfer.setData('application/json', JSON.stringify(getCellState(draggedCell)));
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => draggedCell.classList.add('is-dragging'), 0);
            } else {
                e.preventDefault();
            }
            break;
        case 'dragover':
            e.preventDefault();
            document.querySelectorAll('.drag-over-target').forEach(el => el.classList.remove('drag-over-target'));
            if (targetCell && !targetCell.classList.contains('break-cell') && draggedCell !== targetCell) {
                targetCell.classList.add('drag-over-target');
            }
            break;
        case 'dragleave':
            targetCell?.classList.remove('drag-over-target');
            break;
        case 'drop':
            e.preventDefault();
            if (targetCell && !targetCell.classList.contains('break-cell') && draggedCell && draggedCell !== targetCell) {
                pushToUndoStack(getTableState());
                const draggedData = JSON.parse(e.dataTransfer.getData('application/json'));
                const targetData = getCellState(targetCell);
                applyCellState(targetCell, draggedData);
                applyCellState(draggedCell, targetData);
                saveData();
            }
            // fallthrough
        case 'dragend':
            draggedCell?.classList.remove('is-dragging');
            document.querySelectorAll('.drag-over-target').forEach(el => el.classList.remove('drag-over-target'));
            draggedCell = null;
            break;
    }
}

function handleSearch(term) {
    const clearButton = document.getElementById('clearSearchButton');
    if (clearButton) clearButton.style.display = term ? 'block' : 'none';
    const regex = term ? new RegExp(term.replace(/[-\/\^$*+?.()|[\]{}]/g, '\$&'), 'gi') : null;

    document.querySelectorAll('th.editable-header, td.editable-cell').forEach(cell => {
        const elements = cell.classList.contains('split-cell') ? cell.querySelectorAll('div') : [cell];
        elements.forEach(element => {
            // Restore original text
            element.querySelectorAll('span.search-highlight').forEach(span => {
                const parent = span.parentNode;
                while (span.firstChild) parent.insertBefore(span.firstChild, span);
                parent.removeChild(span);
                parent.normalize();
            });
            // Apply new highlight
            if (regex) {
                const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
                const nodes = [];
                while (walker.nextNode()) nodes.push(walker.currentNode);
                nodes.forEach(node => {
                    const newHtml = node.nodeValue.replace(regex, `<span class="search-highlight">$&</span>`);
                    if (newHtml !== node.nodeValue) {
                        const newFragment = document.createRange().createContextualFragment(newHtml);
                        node.parentNode.replaceChild(newFragment, node);
                    }
                });
            }
        });
    });
}


// =================================================================================
// SEKCJA: EDYCJA KOMÓREK I NAWIGACJA
// =================================================================================

function setActiveElement(element) {
    if (activeElement) activeElement.classList.remove('active-cell');
    activeElement = element;
    if (activeElement) {
        activeElement.classList.add('active-cell');
        activeElement.focus();
    }
}

function enterEditMode(element, clearContent = false, initialChar = '') {
    if (!element || element.isContentEditable) return;
    const parentCell = element.closest('td');
    if (parentCell?.classList.contains('break-cell')) return;

    pushToUndoStack(getTableState());

    if (element.tagName==='TD' && element.classList.contains('split-cell')) {
        return enterEditMode(element.querySelector('div'), clearContent, initialChar);
    }
    
    element.textContent = clearContent ? initialChar : element.textContent + initialChar;
    element.setAttribute('contenteditable', 'true');
    element.focus();
    // Move cursor to end
    const sel = window.getSelection();
    sel.selectAllChildren(element);
    sel.collapseToEnd();
}

function exitEditMode(element, saveChanges = true) {
    if (!element?.isContentEditable) return;
    element.removeAttribute('contenteditable');
    if (saveChanges) {
        const parentCell = element.closest('td, th');
        // Clean up data attributes if text is empty
        if (element.textContent.trim() === '') {
            delete parentCell.dataset.isMassage;
            delete parentCell.dataset.isPnf;
        }
        parentCell.style.backgroundColor = (parentCell.textContent.trim() !== '') ? CONTENT_CELL_COLOR : DEFAULT_CELL_COLOR;
        saveData();
        pushToUndoStack(getTableState());
    } else {
        // Revert changes by applying last state from undo stack
        applyStateToTable(undoStack[undoStack.length - 1]);
    }
}

// =================================================================================
// SEKCJA: MENU KONTEKSTOWE
// =================================================================================

function showContextMenu(cell, event) {
    const menu = document.getElementById('contextMenu');
    setActiveElement(cell);

    const isBreak = cell.classList.contains('break-cell');
    menu.querySelector('#contextAddBreak').style.display = isBreak ? 'none' : 'flex';
    menu.querySelector('#contextRemoveBreak').style.display = isBreak ? 'flex' : 'none';
    ['#contextClear', '#contextSplitCell', '#contextMassage', '#contextPnf'].forEach(id => {
        menu.querySelector(id).style.display = isBreak ? 'none' : 'flex';
    });
    
    menu.style.left = `${event.pageX}px`;
    menu.style.top = `${event.pageY}px`;
    menu.classList.add('visible');

    // Setup one-time listeners for menu actions
    const once = { once: true };
    menu.querySelector('#contextAddBreak').addEventListener('click', () => modifyCell('break'), once);
    menu.querySelector('#contextRemoveBreak').addEventListener('click', () => modifyCell('clear'), once);
    menu.querySelector('#contextClear').addEventListener('click', () => modifyCell('clear'), once);
    menu.querySelector('#contextSplitCell').addEventListener('click', () => modifyCell('split'), once);
    menu.querySelector('#contextMassage').addEventListener('click', () => modifyCell('toggleMassage'), once);
    menu.querySelector('#contextPnf').addEventListener('click', () => modifyCell('togglePnf'), once);
}

function hideContextMenu() {
    document.getElementById('contextMenu')?.classList.remove('visible');
}

function hideContextMenuOnClickOutside(event) {
    const menu = document.getElementById('contextMenu');
    if (menu && !menu.contains(event.target)) {
        hideContextMenu();
    }
}

function modifyCell(action) {
    const cell = activeElement.closest('td');
    if (!cell) return;
    pushToUndoStack(getTableState());
    
    let state = getCellState(cell);
    switch(action) {
        case 'break': state = { isBreak: true }; break;
        case 'clear': state = {}; break;
        case 'split': if (!state.isSplit) state = { isSplit: true, content1: state.content }; break;
        case 'toggleMassage': state.isMassage = !state.isMassage; break;
        case 'togglePnf': state.isPnf = !state.isPnf; break;
    }
    
    applyCellState(cell, state);
    saveData();
    pushToUndoStack(getTableState());
    hideContextMenu();
}


// =================================================================================
// SEKCJA: FUNKCJE POMOCNICZE (UI)
// =================================================================================

function showLoading(message) {
    const overlay = document.getElementById('loadingOverlay');
    if(overlay) {
        overlay.querySelector('p').textContent = message;
        overlay.classList.remove('hidden');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if(overlay) overlay.classList.add('hidden');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (container) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    } else {
        alert(message);
    }
}
