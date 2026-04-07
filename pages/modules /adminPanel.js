/**
 * Модуль AdminPanel
 * Версия: 1.0
 */

import { DataStore } from './dataStore.js';
import { escapeHtml, formatPhone, showToast, debounce, getCategoryDisplay, shortenRole } from './uiHelpers.js';
import { initTheme, toggleTheme } from './themeManager.js';

export class AdminPanel {
    constructor() {
        this.dataStore = new DataStore();
        this.currentEditId = null;
    }

    async init() {
        initTheme();
        this.dataStore.loadFromLocalStorage();
        this.dataStore.applyFilters();
        
        this.populateDeveloperFilter();
        this.populateDeveloperDatalist();
        this.renderTable();
        this.updateStats();
        this.setupEventListeners();
        
        console.log('✅ Админ-панель инициализирована');
    }

    populateDeveloperFilter() {
        const select = document.getElementById('filterDeveloper');
        if (!select) return;
        
        const developers = this.dataStore.getDevelopersList();
        select.innerHTML = '<option value="">Все застройщики</option>';
        
        for (const dev of developers) {
            const option = document.createElement('option');
            option.value = dev;
            option.textContent = dev;
            select.appendChild(option);
        }
    }

    populateDeveloperDatalist() {
        const datalist = document.getElementById('developersDatalist');
        if (!datalist) return;
        
        const developers = this.dataStore.getDevelopersList();
        datalist.innerHTML = '';
        
        for (const dev of developers) {
            const option = document.createElement('option');
            option.value = dev;
            datalist.appendChild(option);
        }
    }

    updateStats() {
        const stats = this.dataStore.getStats();
        
        const totalRecordsEl = document.getElementById('totalRecords');
        const totalDevelopersEl = document.getElementById('totalDevelopers');
        const totalComplexesEl = document.getElementById('totalComplexes');
        const totalManagersEl = document.getElementById('totalManagers');
        
        if (totalRecordsEl) totalRecordsEl.textContent = stats.total;
        if (totalDevelopersEl) totalDevelopersEl.textContent = stats.developers;
        if (totalComplexesEl) totalComplexesEl.textContent = stats.complexes;
        if (totalManagersEl) totalManagersEl.textContent = stats.managers;
    }

    renderTable() {
        const tbody = document.getElementById('tableBody');
        if (!tbody) return;
        
        const records = this.dataStore.getCurrentPageRecords();
        
        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 40px;">📭 Нет данных</td></tr>';
            this.updatePaginationButtons();
            this.updatePageInfo();
            return;
        }
        
        tbody.innerHTML = records.map(record => {
            const categoryDisplay = getCategoryDisplay(record.category);
            const roleShort = shortenRole(record.role);
            
            return `
                <tr data-id="${record.id}">
                    <td class="editable" data-field="developer">${escapeHtml(record.developer)}</td>
                    <td class="editable" data-field="complex">${escapeHtml(record.complex)}</td>
                    <td class="editable" data-field="address">${escapeHtml(record.address) || '-'}</td>
                    <td class="editable" data-field="opAddress">${escapeHtml(record.opAddress) || '-'}</td>
                    <td class="editable" data-field="commonPhone">${escapeHtml(record.commonPhone) || '-'}</td>
                    <td class="editable" data-field="manager">${escapeHtml(record.manager) || '-'}</td>
                    <td class="editable" data-field="managerPhone">${escapeHtml(record.managerPhone) || '-'}</td>
                    <td class="editable" data-field="role">${escapeHtml(roleShort)}</td>
                    <td class="editable" data-field="category">${categoryDisplay.icon} ${categoryDisplay.text}</td>
                    <td class="action-cell">
                        <button class="edit-row-btn" title="Редактировать"><i class="fas fa-edit"></i></button>
                        <button class="delete-row-btn" title="Удалить"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
        
        this.updatePaginationButtons();
        this.updatePageInfo();
        this.attachTableEventListeners();
    }

    attachTableEventListeners() {
        const editableCells = document.querySelectorAll('.editable');
        editableCells.forEach(cell => {
            cell.removeEventListener('click', this.handleCellClick);
            cell.addEventListener('click', this.handleCellClick.bind(this));
        });
        
        const editButtons = document.querySelectorAll('.edit-row-btn');
        editButtons.forEach(btn => {
            btn.removeEventListener('click', this.handleEditRow);
            btn.addEventListener('click', this.handleEditRow.bind(this));
        });
        
        const deleteButtons = document.querySelectorAll('.delete-row-btn');
        deleteButtons.forEach(btn => {
            btn.removeEventListener('click', this.handleDeleteRow);
            btn.addEventListener('click', this.handleDeleteRow.bind(this));
        });
    }

    handleCellClick = (event) => {
        const cell = event.currentTarget;
        const row = cell.closest('tr');
        const recordId = row.dataset.id;
        const field = cell.dataset.field;
        const currentValue = cell.textContent.trim() === '-' ? '' : cell.textContent.trim();
        
        let input;
        if (field === 'category') {
            input = document.createElement('select');
            input.innerHTML = `
                <option value="newbuild" ${currentValue.includes('Новостройка') ? 'selected' : ''}>🏢 Новостройка</option>
                <option value="suburban" ${currentValue.includes('Загородная') ? 'selected' : ''}>🏡 Загородная</option>
            `;
        } else if (field === 'role') {
            input = document.createElement('select');
            input.innerHTML = `
                <option value="менеджер" ${currentValue === 'менеджер' ? 'selected' : ''}>Менеджер</option>
                <option value="руководитель ОП" ${currentValue === 'руководитель ОП' ? 'selected' : ''}>Руководитель ОП</option>
                <option value="специалист по работе с партнерами" ${currentValue === 'Спец. по партнерам' ? 'selected' : ''}>Специалист по работе с партнерами</option>
            `;
        } else {
            input = document.createElement('input');
            input.type = 'text';
            input.value = currentValue;
        }
        
        cell.classList.add('editing');
        cell.textContent = '';
        cell.appendChild(input);
        input.focus();
        
        const saveEdit = () => {
            let newValue = input.value;
            cell.classList.remove('editing');
            
            const record = this.dataStore.records.find(r => r.id === recordId);
            if (record) {
                record[field] = newValue;
                if (field === 'commonPhone' || field === 'managerPhone') {
                    record[field] = formatPhone(newValue);
                }
                this.dataStore.saveToLocalStorage();
                this.dataStore.applyFilters();
                this.renderTable();
                this.updateStats();
                this.populateDeveloperFilter();
                this.populateDeveloperDatalist();
                showToast(`✅ Поле "${field}" обновлено`);
            }
        };
        
        const cancelEdit = () => {
            cell.classList.remove('editing');
            this.renderTable();
        };
        
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveEdit();
            if (e.key === 'Escape') cancelEdit();
        });
    }

    handleEditRow = (event) => {
        const btn = event.currentTarget;
        const row = btn.closest('tr');
        const recordId = row.dataset.id;
        const record = this.dataStore.getRecordById(recordId);
        
        if (record) {
            this.currentEditId = recordId;
            this.loadRecordToModal(record);
            this.openModal();
        }
    }

    handleDeleteRow = (event) => {
        const btn = event.currentTarget;
        const row = btn.closest('tr');
        const recordId = row.dataset.id;
        
        if (confirm('🗑️ Удалить эту запись?')) {
            this.dataStore.deleteRecord(recordId);
            this.renderTable();
            this.updateStats();
            this.populateDeveloperFilter();
            this.populateDeveloperDatalist();
            showToast('✅ Запись удалена');
        }
    }

    loadRecordToModal(record) {
        const developerInput = document.getElementById('formDeveloper');
        const complexInput = document.getElementById('formComplex');
        const addressInput = document.getElementById('formAddress');
        const opAddressInput = document.getElementById('formOpAddress');
        const commonPhoneInput = document.getElementById('formCommonPhone');
        const managerInput = document.getElementById('formManager');
        const managerPhoneInput = document.getElementById('formManagerPhone');
        const roleSelect = document.getElementById('formRole');
        const categorySelect = document.getElementById('formCategory');
        const modalTitle = document.getElementById('modalTitle');
        
        if (developerInput) developerInput.value = record.developer || '';
        if (complexInput) complexInput.value = record.complex || '';
        if (addressInput) addressInput.value = record.address || '';
        if (opAddressInput) opAddressInput.value = record.opAddress || '';
        if (commonPhoneInput) commonPhoneInput.value = record.commonPhone || '';
        if (managerInput) managerInput.value = record.manager || '';
        if (managerPhoneInput) managerPhoneInput.value = record.managerPhone || '';
        if (roleSelect) roleSelect.value = record.role || 'менеджер';
        if (categorySelect) categorySelect.value = record.category || 'newbuild';
        if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-edit"></i> Редактирование записи';
    }

    getModalFormData() {
        const developerInput = document.getElementById('formDeveloper');
        const complexInput = document.getElementById('formComplex');
        const addressInput = document.getElementById('formAddress');
        const opAddressInput = document.getElementById('formOpAddress');
        const commonPhoneInput = document.getElementById('formCommonPhone');
        const managerInput = document.getElementById('formManager');
        const managerPhoneInput = document.getElementById('formManagerPhone');
        const roleSelect = document.getElementById('formRole');
        const categorySelect = document.getElementById('formCategory');
        
        return {
            developer: developerInput?.value.trim() || '',
            complex: complexInput?.value.trim() || '',
            address: addressInput?.value.trim() || '',
            opAddress: opAddressInput?.value.trim() || '',
            commonPhone: commonPhoneInput?.value.trim() || '',
            manager: managerInput?.value.trim() || '',
            managerPhone: managerPhoneInput?.value.trim() || '',
            role: roleSelect?.value || 'менеджер',
            category: categorySelect?.value || 'newbuild'
        };
    }

    clearModalForm() {
        const fields = ['formDeveloper', 'formComplex', 'formAddress', 'formOpAddress', 'formCommonPhone', 'formManager', 'formManagerPhone'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        
        const roleSelect = document.getElementById('formRole');
        if (roleSelect) roleSelect.value = 'менеджер';
        
        const categorySelect = document.getElementById('formCategory');
        if (categorySelect) categorySelect.value = 'newbuild';
        
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Новая запись';
        
        this.currentEditId = null;
    }

    openModal() {
        const modal = document.getElementById('recordModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal() {
        const modal = document.getElementById('recordModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            this.clearModalForm();
        }
    }

    saveModalForm() {
        const formData = this.getModalFormData();
        
        if (!formData.developer) {
            showToast('❌ Введите название застройщика', true);
            document.getElementById('formDeveloper')?.focus();
            return;
        }
        
        if (!formData.complex) {
            showToast('❌ Введите название ЖК', true);
            document.getElementById('formComplex')?.focus();
            return;
        }
        
        if (this.currentEditId) {
            this.dataStore.updateRecord(this.currentEditId, formData);
            showToast('✅ Запись обновлена');
        } else {
            this.dataStore.addRecord(formData);
            showToast('✅ Новая запись добавлена');
        }
        
        this.closeModal();
        this.renderTable();
        this.updateStats();
        this.populateDeveloperFilter();
        this.populateDeveloperDatalist();
    }

    updatePageInfo() {
        const pageInfo = document.getElementById('pageInfo');
        if (pageInfo) {
            pageInfo.textContent = `Страница ${this.dataStore.currentPage} из ${this.dataStore.getTotalPages() || 1}`;
        }
    }

    updatePaginationButtons() {
        const firstBtn = document.getElementById('firstPageBtn');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const lastBtn = document.getElementById('lastPageBtn');
        
        const currentPage = this.dataStore.currentPage;
        const totalPages = this.dataStore.getTotalPages();
        
        if (firstBtn) firstBtn.disabled = currentPage <= 1;
        if (prevBtn) prevBtn.disabled = currentPage <= 1;
        if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
        if (lastBtn) lastBtn.disabled = currentPage >= totalPages;
    }

    goToPage(page) {
        const totalPages = this.dataStore.getTotalPages();
        if (page < 1 || page > totalPages) return;
        
        this.dataStore.currentPage = page;
        this.renderTable();
    }

    importCSV(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = this.dataStore.importFromCSV(e.target.result);
            this.renderTable();
            this.updateStats();
            this.populateDeveloperFilter();
            this.populateDeveloperDatalist();
            showToast(`✅ Импортировано ${result.imported} записей`);
        };
        reader.onerror = () => showToast('❌ Ошибка чтения файла', true);
        reader.readAsText(file, 'UTF-8');
    }

    exportCSV() {
        const csv = this.dataStore.exportToCSV();
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `contacts_${new Date().toISOString().slice(0, 19)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('📥 CSV файл скачан');
    }

    exportExcel() {
        const data = this.dataStore.exportToExcelData();
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Контакты ЖК');
        XLSX.writeFile(wb, `contacts_${new Date().toISOString().slice(0, 19)}.xlsx`);
        showToast('📎 Excel файл скачан');
    }

    clearFilters() {
        const searchInput = document.getElementById('searchInput');
        const filterDeveloper = document.getElementById('filterDeveloper');
        const filterCategory = document.getElementById('filterCategory');
        
        if (searchInput) searchInput.value = '';
        if (filterDeveloper) filterDeveloper.value = '';
        if (filterCategory) filterCategory.value = '';
        
        this.dataStore.searchQuery = '';
        this.dataStore.filterDeveloper = '';
        this.dataStore.filterCategory = '';
        this.dataStore.applyFilters();
        this.renderTable();
        this.updateStats();
        showToast('🔄 Фильтры сброшены');
    }

    handleSearch = debounce((value) => {
        this.dataStore.searchQuery = value;
        this.dataStore.applyFilters();
        this.renderTable();
        this.updateStats();
    }, 300);

    setupEventListeners() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) themeToggle.addEventListener('click', () => toggleTheme());
        
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }
        
        const filterDeveloper = document.getElementById('filterDeveloper');
        const filterCategory = document.getElementById('filterCategory');
        
        if (filterDeveloper) {
            filterDeveloper.addEventListener('change', (e) => {
                this.dataStore.filterDeveloper = e.target.value;
                this.dataStore.applyFilters();
                this.renderTable();
                this.updateStats();
            });
        }
        
        if (filterCategory) {
            filterCategory.addEventListener('change', (e) => {
                this.dataStore.filterCategory = e.target.value;
                this.dataStore.applyFilters();
                this.renderTable();
                this.updateStats();
            });
        }
        
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        
        const firstPageBtn = document.getElementById('firstPageBtn');
        const prevPageBtn = document.getElementById('prevPageBtn');
        const nextPageBtn = document.getElementById('nextPageBtn');
        const lastPageBtn = document.getElementById('lastPageBtn');
        const perPageSelect = document.getElementById('perPageSelect');
        
        if (firstPageBtn) firstPageBtn.addEventListener('click', () => this.goToPage(1));
        if (prevPageBtn) prevPageBtn.addEventListener('click', () => this.goToPage(this.dataStore.currentPage - 1));
        if (nextPageBtn) nextPageBtn.addEventListener('click', () => this.goToPage(this.dataStore.currentPage + 1));
        if (lastPageBtn) lastPageBtn.addEventListener('click', () => this.goToPage(this.dataStore.getTotalPages()));
        
        if (perPageSelect) {
            perPageSelect.addEventListener('change', (e) => {
                this.dataStore.perPage = parseInt(e.target.value);
                this.dataStore.currentPage = 1;
                this.renderTable();
            });
        }
        
        const importBtn = document.getElementById('importCsvBtn');
        const importFileInput = document.getElementById('importFileInput');
        const exportCsvBtn = document.getElementById('exportCsvBtn');
        const exportExcelBtn = document.getElementById('exportExcelBtn');
        const newRecordBtn = document.getElementById('newRecordBtn');
        
        if (importBtn && importFileInput) {
            importBtn.addEventListener('click', () => importFileInput.click());
            importFileInput.addEventListener('change', (e) => {
                if (e.target.files[0]) this.importCSV(e.target.files[0]);
                importFileInput.value = '';
            });
        }
        
        if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => this.exportCSV());
        if (exportExcelBtn) exportExcelBtn.addEventListener('click', () => this.exportExcel());
        
        if (newRecordBtn) {
            newRecordBtn.addEventListener('click', () => {
                this.clearModalForm();
                this.openModal();
            });
        }
        
        const closeModalBtn = document.getElementById('closeModalBtn');
        const cancelModalBtn = document.getElementById('cancelModalBtn');
        const saveModalBtn = document.getElementById('saveModalBtn');
        const modal = document.getElementById('recordModal');
        
        if (closeModalBtn) closeModalBtn.addEventListener('click', () => this.closeModal());
        if (cancelModalBtn) cancelModalBtn.addEventListener('click', () => this.closeModal());
        if (saveModalBtn) saveModalBtn.addEventListener('click', () => this.saveModalForm());
        
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal();
            });
        }
        
        const commonPhoneInput = document.getElementById('formCommonPhone');
        const managerPhoneInput = document.getElementById('formManagerPhone');
        
        if (commonPhoneInput) {
            commonPhoneInput.addEventListener('blur', (e) => {
                e.target.value = formatPhone(e.target.value);
            });
        }
        
        if (managerPhoneInput) {
            managerPhoneInput.addEventListener('blur', (e) => {
                e.target.value = formatPhone(e.target.value);
            });
        }
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
    }
}
