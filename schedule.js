
document.addEventListener('DOMContentLoaded', () => {
    // WAŻNE: Wklej tutaj nowy URL wdrożonej aplikacji Google Apps Script
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxWll_xu1NWXXXint2OkVcriv20NApTkesBGrgqgcVYYWPAoLUDMqszNRzNuDK1I7VaQQ/exec';

    const loadingOverlay = document.getElementById('loadingOverlay');
    const mainTable = document.getElementById('mainScheduleTable');
    const tableHeaderRow = document.getElementById('tableHeaderRow');
    const tbody = mainTable.querySelector('tbody');
    const contextMenu = document.getElementById('contextMenu');
    const undoButton = document.getElementById('undoButton');
    const searchInput = document.getElementById('searchInput');
    const clearSearchButton = document.getElementById('clearSearchButton');

    // Context Menu Options
    const contextSplitCell = document.getElementById('contextSplitCell');
    const contextAddBreak = document.getElementById('contextAddBreak');
    const contextMassage = document.getElementById('contextMassage');
    const contextPnf = document.getElementById('contextPnf');
    const contextClear = document.getElementById('contextClear');
    const contextRemoveBreak = document.getElementById('contextRemoveBreak');

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

    // --- Helper Functions ---
    const refreshRowHeight = (cell) => {
        if (!cell) return;
        const parentRow = cell.closest('tr');
        if (parentRow) parentRow.style.height = 'auto';
    };

    const refreshAllRowHeights = () => {
        document.querySelectorAll('#mainScheduleTable tbody tr').forEach(row => {
            row.style.height = 'auto';
        });
    };

    const capitalizeFirstLetter = (string) => {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    };

    const getElementText = (element) => {
        if (!element || element.classList.contains('break-cell')) return '';
        const clone = element.cloneNode(true);
        clone.querySelectorAll('.cell-icon').forEach(icon => icon.remove());
        const spans = clone.querySelectorAll('span');
        let text = '';
        if (spans.length > 0) {
            spans.forEach(span => { text += span.textContent + ' ' });
        } else {
            text = clone.textContent;
        }
        return text.trim();
    };


    // --- Core Application Logic ---

    const generateScheduleTable = () => {
        tableHeaderRow.innerHTML = '<th>Godz.</th>';
        tbody.innerHTML = '';

        for (let i = 0; i < NUMBER_OF_EMPLOYEES; i++) {
            const th = document.createElement('th');
            th.textContent = `Pracownik ${i + 1}`;
            th.classList.add('editable-header');
            th.setAttribute('data-employee-index', i);
            th.setAttribute('tabindex', '0');
            tableHeaderRow.appendChild(th);
        }

        for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                if (hour === END_HOUR && minute === 30) continue;
                const tr = tbody.insertRow();
                const timeString = `${hour}:${minute.toString().padStart(2, '0')}`;
                tr.insertCell().textContent = timeString;
                for (let i = 0; i < NUMBER_OF_EMPLOYEES; i++) {
                    const cell = tr.insertCell();
                    cell.classList.add('editable-cell');
                    cell.setAttribute('data-time', timeString);
                    cell.setAttribute('data-employee-index', i);
                    cell.setAttribute('draggable', 'true');
                    cell.setAttribute('tabindex', '0');
                }
            }
        }
    };
    
    const applyCellDataToDom = (cell, cellObj) => {
        cell.className = 'editable-cell';
        cell.innerHTML = '';
        delete cell.dataset.isMassage;
        delete cell.dataset.isPnf;

        if (cellObj.isBreak) {
            cell.textContent = BREAK_TEXT;
            cell.classList.add('break-cell');
            cell.style.backgroundColor = DEFAULT_CELL_COLOR;
        } else if (cellObj.isSplit) {
            const createPart = (content, isMassage, isPnf) => {
                const div = document.createElement('div');
                div.setAttribute('tabindex', '0');
                let htmlContent = `<span>${capitalizeFirstLetter(content || '')}</span>`;
                if (isMassage) {
                    div.classList.add('massage-text');
                    div.dataset.isMassage = 'true';
                }
                if (isPnf) {
                    div.classList.add('pnf-text');
                    div.dataset.isPnf = 'true';
                }
                div.innerHTML = htmlContent;
                return div;
            };
            cell.classList.add('split-cell');
            cell.style.backgroundColor = CONTENT_CELL_COLOR;
            cell.appendChild(createPart(cellObj.content1, cellObj.isMassage1, cellObj.isPnf1));
            cell.appendChild(createPart(cellObj.content2, cellObj.isMassage2, cellObj.isPnf2));
        } else {
            let htmlContent = `<span>${capitalizeFirstLetter(cellObj.content || '')}</span>`;
            if (cellObj.isMassage) {
                cell.classList.add('massage-text');
                cell.dataset.isMassage = 'true';
            }
             if (cellObj.isPnf) {
                cell.classList.add('pnf-text');
                cell.dataset.isPnf = 'true';
            }
            cell.innerHTML = htmlContent;
            cell.style.backgroundColor = (getElementText(cell).trim() !== '') ? CONTENT_CELL_COLOR : DEFAULT_CELL_COLOR;
        }
    };

    const getCurrentTableStateForCell = (cell) => {
        if (cell.classList.contains('break-cell')) {
            return { content: BREAK_TEXT, isBreak: true };
        }
        if (cell.classList.contains('split-cell')) {
            const part1 = cell.children[0];
            const part2 = cell.children[1];
            return {
                content1: getElementText(part1), content2: getElementText(part2),
                isSplit: true,
                isMassage1: part1?.dataset.isMassage === 'true', isMassage2: part2?.dataset.isMassage === 'true',
                isPnf1: part1?.dataset.isPnf === 'true', isPnf2: part2?.dataset.isPnf === 'true'
            };
        }
        return {
            content: getElementText(cell),
            isMassage: cell.dataset.isMassage === 'true',
            isPnf: cell.dataset.isPnf === 'true'
        };
    };

    // --- Data Sync with Google Apps Script ---

    const loadSchedule = async () => {
        try {
            const response = await fetch(`${WEB_APP_URL}?action=loadSchedule`);
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
            const response = await fetch(`${WEB_APP_URL}?action=saveSchedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scheduleData)
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

    // --- Undo/Redo ---

    const getCurrentTableState = () => {
        const state = { employeeHeaders: {}, scheduleCells: {} };
        document.querySelectorAll('th[data-employee-index]').forEach(th => {
            state.employeeHeaders[th.dataset.employeeIndex] = th.textContent;
        });
        document.querySelectorAll('td.editable-cell').forEach(cell => {
            const time = cell.dataset.time;
            const employeeIndex = cell.dataset.employeeIndex;
            if (!state.scheduleCells[time]) state.scheduleCells[time] = {};
            state.scheduleCells[time][employeeIndex] = getCurrentTableStateForCell(cell);
        });
        return state;
    };

    const applyTableState = (state) => {
        document.querySelectorAll('th.editable-header').forEach(th => {
            const index = th.dataset.employeeIndex;
            if (state.employeeHeaders?.[index] !== undefined) {
                th.textContent = capitalizeFirstLetter(state.employeeHeaders[index]);
            }
        });
        document.querySelectorAll('td.editable-cell').forEach(cell => {
            const time = cell.dataset.time;
            const employeeIndex = cell.dataset.employeeIndex;
            const cellData = state.scheduleCells?.[time]?.[employeeIndex];
            if (cellData) {
                applyCellDataToDom(cell, cellData);
            } else {
                 cell.className = 'editable-cell';
                 cell.innerHTML = '';
                 cell.style.backgroundColor = DEFAULT_CELL_COLOR;
            }
        });
        refreshAllRowHeights();
        saveSchedule();
    };
    
    const pushStateToUndoStack = () => {
        const currentState = getCurrentTableState();
        // Avoid pushing identical states
        if (undoStack.length > 0 && JSON.stringify(undoStack[undoStack.length - 1]) === JSON.stringify(currentState)) {
            return;
        }
        undoStack.push(currentState);
        if (undoStack.length > MAX_UNDO_STATES) undoStack.shift();
        redoStack.length = 0; // Clear redo stack on new action
        updateUndoRedoButtons();
    };

    const undoLastAction = () => {
        if (undoStack.length > 1) { // Need at least one state to revert to
            const currentState = undoStack.pop();
            redoStack.push(currentState);
            const prevState = undoStack[undoStack.length - 1];
            applyTableState(prevState); // This will also trigger a save
            updateUndoRedoButtons();
        }
    };

    const updateUndoRedoButtons = () => {
        undoButton.disabled = undoStack.length <= 1;
    };
    

    // --- UI Interaction & Event Handlers ---
    
    // ... (reszta kodu bez zmian: edycja, menu kontekstowe, drag-drop, nawigacja)
    const setActiveCell = (cell) => {
        if (activeCell) {
            activeCell.classList.remove('active-cell');
            if (activeCell.tagName === 'DIV' && activeCell.parentNode.classList.contains('active-cell')) {
                 activeCell.parentNode.classList.remove('active-cell');
            }
            if (activeCell.getAttribute('contenteditable') === 'true') {
                exitEditMode(activeCell);
            }
        }
        
        activeCell = cell;

        if (activeCell) {
            activeCell.classList.add('active-cell');
            if (activeCell.tagName === 'DIV') {
                activeCell.parentNode.classList.add('active-cell');
            }
            activeCell.focus();
        }
    };

    const enterEditMode = (element, clearContent = false, initialChar = '') => {
        if (!element || element.classList.contains('break-cell') || element.getAttribute('contenteditable') === 'true') {
            return;
        }

        if (element.tagName === 'TD' && element.classList.contains('split-cell')) {
            const firstDiv = element.querySelector('div');
            if (firstDiv) {
                enterEditMode(firstDiv, clearContent, initialChar);
                setActiveCell(firstDiv);
            }
            return;
        }

        const isEditableTarget = (element.tagName === 'TD' && !element.classList.contains('split-cell')) ||
                                 (element.tagName === 'TH' && element.classList.contains('editable-header')) ||
                                 (element.tagName === 'DIV' && element.parentNode.classList.contains('split-cell'));

        if (!isEditableTarget) return;

        pushStateToUndoStack();

        if (element.tagName === 'TD' || element.tagName === 'TH') {
            element.innerHTML = getElementText(element);
        } else if (element.tagName === 'DIV') {
            element.innerHTML = getElementText(element);
        }

        element.setAttribute('contenteditable', 'true');
        element.classList.remove('massage-text', 'pnf-text');
        delete element.dataset.isMassage;
        delete element.dataset.isPnf;

        if (clearContent) {
            element.textContent = initialChar;
        } else if (initialChar) {
            element.textContent += initialChar;
        }

        element.focus();
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(element);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
    };
    
    const exitEditMode = (element) => {
        if (!element || element.getAttribute('contenteditable') !== 'true') return;

        const originalText = getElementText(element);
        const newText = capitalizeFirstLetter(element.textContent.trim());

        element.setAttribute('contenteditable', 'false');

        const parentCell = element.closest('td, th');

        // Check if a meaningful change occurred before saving
        if (originalText !== newText || parentCell.classList.contains('split-cell')) {
            let stateToApply;
            if(parentCell.tagName === 'TH') {
                 parentCell.textContent = newText;
            } else {
                 if (newText.includes('/') && !parentCell.classList.contains('split-cell')) {
                    const parts = newText.split('/', 2);
                    stateToApply = { isSplit: true, content1: parts[0], content2: parts[1] };
                } else {
                     if (parentCell.classList.contains('split-cell')) {
                        const otherDiv = (element === parentCell.children[0]) ? parentCell.children[1] : parentCell.children[0];
                        const otherText = getElementText(otherDiv);
                        const isFirst = (element === parentCell.children[0]);
                        const c1 = isFirst ? newText : otherText;
                        const c2 = isFirst ? otherText : newText;
                        
                        if (c1 === '' && c2 === '') {
                             stateToApply = { content: '' }; // Un-split the cell
                        } else {
                             stateToApply = { isSplit: true, content1: c1, content2: c2 };
                        }
                     } else {
                        stateToApply = { content: newText };
                     }
                }
                 applyCellDataToDom(parentCell, stateToApply);
            }

            saveSchedule();
            pushStateToUndoStack(); 
        } else {
            // Restore visual state even if no text change
            const state = getCurrentTableStateForCell(parentCell);
            applyCellDataToDom(parentCell, state);
        }
        
        refreshRowHeight(element);
    };

    mainTable.addEventListener('click', (event) => {
        const target = event.target.closest('td.editable-cell, th.editable-header, div[tabindex="0"]');
        if (target) {
            if (activeCell === target && target.getAttribute('contenteditable') === 'true') return;
            if (activeCell && activeCell.getAttribute('contenteditable') === 'true') exitEditMode(activeCell);
            setActiveCell(target);
        } else {
            if (activeCell && activeCell.getAttribute('contenteditable') === 'true') exitEditMode(activeCell);
            setActiveCell(null);
        }
    });

    mainTable.addEventListener('dblclick', (event) => {
        const target = event.target.closest('td.editable-cell, th.editable-header, div[tabindex="0"]');
        if (target) enterEditMode(target);
    });
    
    mainTable.addEventListener('contextmenu', (event) => {
        const target = event.target.closest('td.editable-cell');
        if (target) {
            event.preventDefault();
            setActiveCell(target);
            currentCell = target;

            const isBreak = currentCell.classList.contains('break-cell');
            contextAddBreak.style.display = isBreak ? 'none' : 'flex';
            contextRemoveBreak.style.display = isBreak ? 'flex' : 'none';
            contextClear.style.display = isBreak ? 'none' : 'flex';
            contextSplitCell.style.display = isBreak ? 'none' : 'flex';
            contextMassage.style.display = isBreak ? 'none' : 'flex';
            contextPnf.style.display = isBreak ? 'none' : 'flex';
            
            contextMenu.classList.add('visible');
            contextMenu.style.left = `${event.pageX}px`;
            contextMenu.style.top = `${event.pageY}px`;
        }
    });

    document.addEventListener('click', (event) => {
        if (!contextMenu.contains(event.target)) {
            contextMenu.classList.remove('visible');
        }
        const activeElement = document.activeElement;
        const isOutsideTable = !event.target.closest('#mainScheduleTable');
        
        if (isOutsideTable && activeCell && activeCell.getAttribute('contenteditable') === 'true') {
             exitEditMode(activeCell);
             setActiveCell(null);
        } else if (isOutsideTable) {
             setActiveCell(null);
        }
    });
    
    // Context Menu Actions
    contextAddBreak.addEventListener('click', () => {
        if (currentCell) {
            pushStateToUndoStack();
            applyCellDataToDom(currentCell, { isBreak: true });
            saveSchedule();
            refreshRowHeight(currentCell);
            window.showToast('Dodano przerwę');
        }
        contextMenu.classList.remove('visible');
    });

    contextRemoveBreak.addEventListener('click', () => {
        if (currentCell) {
            pushStateToUndoStack();
            applyCellDataToDom(currentCell, { content: '' });
            saveSchedule();
            refreshRowHeight(currentCell);
            window.showToast('Usunięto przerwę');
        }
        contextMenu.classList.remove('visible');
    });
    
    contextClear.addEventListener('click', () => {
        if (currentCell) {
            pushStateToUndoStack();
            applyCellDataToDom(currentCell, { content: '' });
            saveSchedule();
            refreshRowHeight(currentCell);
            window.showToast('Wyczyszczono komórkę');
        }
        contextMenu.classList.remove('visible');
    });

    contextSplitCell.addEventListener('click', () => {
        if (currentCell) {
            pushStateToUndoStack();
            const currentState = getCurrentTableStateForCell(currentCell);
            applyCellDataToDom(currentCell, { isSplit: true, content1: currentState.content, content2: '' });
            saveSchedule();
            refreshRowHeight(currentCell);
            window.showToast('Podzielono komórkę');
            enterEditMode(currentCell.querySelector('div'));
        }
        contextMenu.classList.remove('visible');
    });

    const toggleSpecialStyle = (dataAttribute) => {
         if (currentCell) {
            pushStateToUndoStack();
            let state = getCurrentTableStateForCell(currentCell);
            
            const targetElement = (activeCell && activeCell.tagName === 'DIV') ? activeCell : currentCell;
            
            if (state.isSplit && targetElement.tagName === 'DIV') {
                 const isFirstPart = targetElement === currentCell.children[0];
                 const key = `${dataAttribute}${isFirstPart ? '1' : '2'}`;
                 state[key] = !state[key];
            } else {
                state[dataAttribute] = !state[dataAttribute];
                if(state.isSplit) {
                     state[`${dataAttribute}1`] = state[dataAttribute];
                     state[`${dataAttribute}2`] = state[dataAttribute];
                }
            }
            
            applyCellDataToDom(currentCell, state);
            saveSchedule();
            refreshRowHeight(currentCell);
            window.showToast('Zmieniono styl');
        }
        contextMenu.classList.remove('visible');
    };

    contextMassage.addEventListener('click', () => toggleSpecialStyle('isMassage'));
    contextPnf.addEventListener('click', () => toggleSpecialStyle('isPnf'));

    // Drag and Drop
    mainTable.addEventListener('dragstart', (event) => {
        const target = event.target.closest('td.editable-cell');
        if (target && !target.classList.contains('break-cell')) {
            draggedCell = target;
            event.dataTransfer.setData('application/json', JSON.stringify(getCurrentTableStateForCell(target)));
            event.dataTransfer.effectAllowed = 'move';
            draggedCell.classList.add('is-dragging');
        } else {
            event.preventDefault();
        }
    });

    mainTable.addEventListener('dragover', (event) => {
        event.preventDefault();
        const dropTargetCell = event.target.closest('td.editable-cell');
        document.querySelectorAll('.drag-over-target').forEach(el => el.classList.remove('drag-over-target'));
        if (dropTargetCell && !dropTargetCell.classList.contains('break-cell') && draggedCell !== dropTargetCell) {
            event.dataTransfer.dropEffect = 'move';
            dropTargetCell.classList.add('drag-over-target');
        } else {
            event.dataTransfer.dropEffect = 'none';
        }
    });

    mainTable.addEventListener('dragleave', (event) => {
        event.target.closest('.drag-over-target')?.classList.remove('drag-over-target');
    });

    mainTable.addEventListener('drop', (event) => {
        event.preventDefault();
        const dropTargetCell = event.target.closest('td.editable-cell');
        document.querySelectorAll('.drag-over-target').forEach(el => el.classList.remove('drag-over-target'));
        
        if (dropTargetCell && !dropTargetCell.classList.contains('break-cell') && draggedCell && draggedCell !== dropTargetCell) {
            pushStateToUndoStack();
            const draggedData = JSON.parse(event.dataTransfer.getData('application/json'));
            const targetData = getCurrentTableStateForCell(dropTargetCell);

            applyCellDataToDom(dropTargetCell, draggedData);
            applyCellDataToDom(draggedCell, targetData);
            
            saveSchedule();
            refreshRowHeight(draggedCell);
            refreshRowHeight(dropTargetCell);
        }
    });

    mainTable.addEventListener('dragend', () => {
        draggedCell?.classList.remove('is-dragging');
        draggedCell = null;
        document.querySelectorAll('.drag-over-target').forEach(el => el.classList.remove('drag-over-target'));
    });
    
    // Keyboard Navigation
    document.addEventListener('keydown', (event) => {
         if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
            event.preventDefault();
            undoLastAction();
            return;
        }

        const target = document.activeElement;
        const isEditing = target.getAttribute('contenteditable') === 'true';

        if(isEditing) {
            if (event.key === 'Escape') exitEditMode(target);
            if (event.key === 'Enter') {
                 event.preventDefault();
                 exitEditMode(target);
                 const parentCell = target.closest('td');
                 const nextRow = parentCell.closest('tr').nextElementSibling;
                 if (nextRow) {
                     const nextCell = nextRow.cells[parentCell.cellIndex];
                     setActiveCell(nextCell);
                 }
            }
            return;
        }
        
        if (!activeCell) return;

        if (event.key === 'Enter') {
            event.preventDefault();
            enterEditMode(activeCell);
            return;
        }
        
        if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
            event.preventDefault();
            enterEditMode(activeCell, true, event.key);
            return;
        }

        let nextElement = null;
        const currentParentTd = activeCell.closest('td, th');
        const currentRow = currentParentTd.closest('tr');
        const currentIndexInRow = Array.from(currentRow.cells).indexOf(currentParentTd);

        switch (event.key) {
            case 'ArrowRight':
                 if(activeCell.tagName === 'DIV' && activeCell.nextElementSibling) {
                     nextElement = activeCell.nextElementSibling;
                 } else {
                     const nextCell = currentRow.cells[currentIndexInRow + 1];
                     if(nextCell) nextElement = nextCell.querySelector('div') || nextCell;
                 }
                break;
            case 'ArrowLeft':
                 if(activeCell.tagName === 'DIV' && activeCell.previousElementSibling) {
                     nextElement = activeCell.previousElementSibling;
                 } else {
                    const prevCell = currentRow.cells[currentIndexInRow - 1];
                    if (prevCell && prevCell.matches('.editable-cell, .editable-header')) {
                         nextElement = Array.from(prevCell.querySelectorAll('div')).pop() || prevCell;
                    }
                 }
                break;
            case 'ArrowDown':
                const nextRow = currentRow.nextElementSibling;
                if(nextRow) {
                    const nextCell = nextRow.cells[currentIndexInRow];
                    if (nextCell) nextElement = nextCell.querySelector('div') || nextCell;
                }
                break;
            case 'ArrowUp':
                const prevRow = currentRow.previousElementSibling;
                 if(prevRow) {
                    const prevCell = prevRow.cells[currentIndexInRow];
                    if (prevCell) nextElement = prevCell.querySelector('div') || prevCell;
                }
                break;
        }

        if (nextElement) {
            event.preventDefault();
            setActiveCell(nextElement);
        }
    });

    // --- WYSZUKIWARKA ---
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        searchAndHighlight(searchTerm);
        clearSearchButton.style.display = searchTerm ? 'block' : 'none';
    });
    
     const searchAndHighlight = (searchTerm) => {
        const allCells = document.querySelectorAll('th.editable-header, td.editable-cell');
        const regex = searchTerm ? new RegExp(searchTerm.replace(/[-\/\^$*+?.()|[\]{}]/g, '\$&'), 'gi') : null;

        const highlightElement = (element) => {
            // Restore original text
            const spans = element.querySelectorAll('span.search-highlight');
            spans.forEach(span => {
                const parent = span.parentNode;
                while (span.firstChild) {
                    parent.insertBefore(span.firstChild, span);
                }
                parent.removeChild(span);
                parent.normalize();
            });

            if (!regex) return;

            // Highlight new search term
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
            const textNodes = [];
            let currentNode;
            while(currentNode = walker.nextNode()) {
                textNodes.push(currentNode);
            }
            
            textNodes.forEach(node => {
                const text = node.nodeValue;
                const newHtml = text.replace(regex, `<span class="search-highlight">$&</span>`);
                if (newHtml !== text) {
                    const newFragment = document.createRange().createContextualFragment(newHtml);
                    node.parentNode.replaceChild(newFragment, node);
                }
            });
        };

        allCells.forEach(cell => {
            const elementsToHighlight = cell.classList.contains('split-cell') ? cell.querySelectorAll('div') : [cell];
            elementsToHighlight.forEach(el => highlightElement(el));
        });
    };

    clearSearchButton.addEventListener('click', () => {
        searchInput.value = '';
        searchAndHighlight('');
        clearSearchButton.style.display = 'none';
        searchInput.focus();
    });

    // --- INICJALIZACJA ---
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
