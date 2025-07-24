document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const tableBody = document.querySelector('#leavesTable tbody');
    const tableRows = tableBody.getElementsByTagName('tr');

    // Przykładowe dane - normalnie byłyby ładowane dynamicznie
    const data = [
        { name: 'Jan Kowalski', leaves: '1-5, 10' },
        { name: 'Anna Nowak', leaves: '8, 15-17' },
        { name: 'Piotr Wiśniewski', leaves: '20, 22' },
        { name: 'Katarzyna Wójcik', leaves: 'Brak urlopu' }
    ];

    function renderTable(filter = '') {
        tableBody.innerHTML = '';
        data.forEach(item => {
            const row = document.createElement('tr');
            const nameCell = document.createElement('td');
            const leavesCell = document.createElement('td');

            if (filter && item.name.toLowerCase().includes(filter.toLowerCase())) {
                const regex = new RegExp(filter, 'gi');
                nameCell.innerHTML = item.name.replace(regex, `<span class="highlight">$&</span>`);
            } else {
                nameCell.textContent = item.name;
            }

            leavesCell.textContent = item.leaves;
            
            row.appendChild(nameCell);
            row.appendChild(leavesCell);

            if (!filter || item.name.toLowerCase().includes(filter.toLowerCase())) {
                 tableBody.appendChild(row);
            }
        });
    }

    searchInput.addEventListener('input', function () {
        const searchTerm = this.value;
        renderTable(searchTerm);
        clearSearchBtn.style.display = searchTerm ? 'block' : 'none';
    });

    clearSearchBtn.addEventListener('click', function () {
        searchInput.value = '';
        renderTable();
        this.style.display = 'none';
    });

    // Początkowe renderowanie tabeli
    renderTable();
});
