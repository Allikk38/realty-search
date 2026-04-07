/**
 * Модуль управления контактами ЖК
 * Версия: 3.0 (Полная переработка)
 * Дата: 07.04.2026
 * 
 * Описание: Админ-панель для управления контактами застройщиков и ЖК
 * 
 * Особенности:
 * - Плоская таблица с 9 колонками (как в CSV)
 * - Редактирование прямо в таблице (клик по ячейке)
 * - Форма добавления/редактирования в правой колонке
 * - Поиск по всем полям
 * - Фильтрация по застройщику и категории
 * - Пагинация (20/50/100/200 записей на страницу)
 * - Импорт/экспорт CSV
 * - Экспорт в Excel (XLSX)
 * - Автоматическое форматирование телефонов
 * - Синхронизация с localStorage в формате для каталога
 * - Интуитивно понятный интерфейс для непрограммистов
 */

// ========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ========================================

/**
 * Экранирование HTML специальных символов
 * @param {string} str - Входная строка
 * @returns {string} - Экранированная строка
 */
export function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, (m) => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

/**
 * Форматирование номера телефона
 * @param {string} phone - Номер телефона в любом формате
 * @returns {string} - Отформатированный номер или пустая строка
 */
export function formatPhone(phone) {
    if (!phone || phone === 'Общий телефон' || phone === 'Телефон ОП') return '';
    
    let cleaned = String(phone).replace(/[^\d+]/g, '');
    
    // Обработка 8-ки
    if (cleaned.startsWith('8') && cleaned.length === 11) {
        cleaned = '+7' + cleaned.slice(1);
    }
    // Обработка 7-ки без плюса
    if (cleaned.startsWith('7') && cleaned.length === 11 && !cleaned.startsWith('+')) {
        cleaned = '+' + cleaned;
    }
    // Обработка 10 цифр без кода
    if (cleaned.length === 10 && !cleaned.startsWith('+')) {
        cleaned = '+7' + cleaned;
    }
    // Форматирование +7 XXX XXX-XX-XX
    if (cleaned.length === 12 && cleaned.startsWith('+7')) {
        return cleaned.replace(/(\+7)(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3-$4-$5');
    }
    
    return phone;
}

/**
 * Показать всплывающее уведомление
 * @param {string} message - Текст уведомления
 * @param {boolean} isError - Флаг ошибки
 */
export function showToast(message, isError = false) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.background = isError ? 'rgba(239, 68, 68, 0.95)' : 'rgba(0, 0, 0, 0.95)';
    toast.innerHTML = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

/**
 * Очистка названия от мусора
 * @param {string} str - Входная строка
 * @returns {string} - Очищенная строка
 */
export function cleanName(str) {
    if (!str) return '';
    return str
        .replace(/Сайт|ТГ-канал|Realt.one/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

// ========================================
// РАБОТА С ДАННЫМИ (ПЛОСКАЯ ТАБЛИЦА)
// ========================================

/**
 * Класс для управления данными (плоская таблица)
 * Каждая запись соответствует одной строке в CSV
 */
class DataStore {
    constructor() {
        this.records = [];      // Массив плоских записей
        this.developersSet = new Set(); // Уникальные застройщики
        this.filteredRecords = [];      // Отфильтрованные записи
        this.currentPage = 1;
        this.perPage = 20;
        this.searchQuery = '';
        this.filterDeveloper = '';
        this.filterCategory = '';
    }

    /**
     * Загрузка данных из localStorage
     * @returns {boolean} - Успех загрузки
     */
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('contactsDatabase');
            if (!saved) {
                console.log('Нет данных в localStorage');
                return false;
            }
            
            const db = JSON.parse(saved);
            // Конвертируем из формата {developers, contacts} в плоскую таблицу
            this.records = [];
            
            for (const [developer, devData] of Object.entries(db.developers || {})) {
                for (const complex of devData.complexes || []) {
                    // Добавляем запись с общим телефоном
                    if (devData.commonPhone) {
                        this.records.push({
                            developer: developer,
                            complex: complex,
                            address: devData.address || '',
                            opAddress: devData.opAddress || '',
                            commonPhone: devData.commonPhone,
                            manager: 'Общий телефон',
                            managerPhone: '',
                            role: 'менеджер',
                            category: devData.category || 'newbuild'
                        });
                    }
                    
                    // Добавляем записи с менеджерами
                    const complexContacts = (db.contacts || []).filter(c => 
                        c.developer === developer && c.complex === complex
                    );
                    
                    for (const contact of complexContacts) {
                        this.records.push({
                            developer: developer,
                            complex: complex,
                            address: devData.address || '',
                            opAddress: devData.opAddress || '',
                            commonPhone: devData.commonPhone || '',
                            manager: contact.name,
                            managerPhone: contact.phone,
                            role: contact.role,
                            category: devData.category || 'newbuild'
                        });
                    }
                }
            }
            
            // Если записей нет, пробуем загрузить демо
            if (this.records.length === 0) {
                this.loadDemoData();
            }
            
            this.updateDevelopersSet();
            console.log(`📀 Загружено ${this.records.length} записей из localStorage`);
            return true;
        } catch (e) {
            console.error('Ошибка загрузки из localStorage:', e);
            return false;
        }
    }

    /**
     * Загрузка демонстрационных данных
     */
    loadDemoData() {
        this.records = [
            { developer: "Расцветай", complex: "Эко-квартал на Кедровой", address: "ул. Кедровая 80/1а", opAddress: "", commonPhone: "+7 (383) 255-88-22", manager: "Данил Швец", managerPhone: "+7 961 873-63-10", role: "менеджер", category: "newbuild" },
            { developer: "Расцветай", complex: "Эко-квартал на Кедровой", address: "ул. Кедровая 80/1а", opAddress: "", commonPhone: "+7 (383) 255-88-22", manager: "Александра Гаммель", managerPhone: "+7 961 848-39-56", role: "менеджер", category: "newbuild" },
            { developer: "Расцветай", complex: "Расцветай на Красном", address: "ул. Красный проспект 165", opAddress: "", commonPhone: "", manager: "Денис Бородин", managerPhone: "+7 960 792-82-68", role: "менеджер", category: "newbuild" },
            { developer: "VIRA (Вира)", complex: "CITATUM (Цитатум)", address: "", opAddress: "ул.Фрунзе 63", commonPhone: "+7 (383) 271-22-22", manager: "Екатерина Рольгайзер", managerPhone: "+7 913 723-00-37", role: "специалист по работе с партнерами", category: "newbuild" },
            { developer: "Брусника. Сибакадемстрой", complex: "Авиатор", address: "", opAddress: "", commonPhone: "", manager: "Максим Попов", managerPhone: "+7 999 463 3627", role: "менеджер", category: "newbuild" }
        ];
        this.updateDevelopersSet();
        this.saveToLocalStorage();
        console.log('📦 Загружены демо-данные');
    }

    /**
     * Обновление списка уникальных застройщиков
     */
    updateDevelopersSet() {
        this.developersSet.clear();
        for (const record of this.records) {
            if (record.developer) {
                this.developersSet.add(record.developer);
            }
        }
    }

    /**
     * Сохранение данных в localStorage (в формате для каталога)
     */
    saveToLocalStorage() {
        const developers = {};
        const contacts = [];
        
        for (const record of this.records) {
            const devName = record.developer;
            const complexName = record.complex;
            
            // Создаем застройщика если нет
            if (!developers[devName]) {
                developers[devName] = {
                    id: 'dev_' + Date.now() + '_' + Math.random(),
                    complexes: [],
                    address: record.address || '',
                    opAddress: record.opAddress || '',
                    commonPhone: record.commonPhone || '',
                    category: record.category || 'newbuild'
                };
            }
            
            const devData = developers[devName];
            
            // Добавляем ЖК если нет
            if (!devData.complexes.includes(complexName)) {
                devData.complexes.push(complexName);
            }
            
            // Обновляем адреса и телефоны
            if (record.address && !devData.address) devData.address = record.address;
            if (record.opAddress && !devData.opAddress) devData.opAddress = record.opAddress;
            if (record.commonPhone && !devData.commonPhone) devData.commonPhone = record.commonPhone;
            
            // Добавляем контакт (если это не общий телефон)
            if (record.manager && record.manager !== 'Общий телефон' && record.managerPhone) {
                contacts.push({
                    developer: devName,
                    complex: complexName,
                    name: record.manager,
                    phone: record.managerPhone,
                    role: record.role || 'менеджер'
                });
            }
        }
        
        const database = { developers, contacts };
        localStorage.setItem('contactsDatabase', JSON.stringify(database));
        localStorage.setItem('lastDataUpdate', new Date().toISOString());
        console.log('💾 Данные сохранены в localStorage');
    }

    /**
     * Применение фильтров
     */
    applyFilters() {
        let filtered = [...this.records];
        
        // Поиск по всем полям
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(record => {
                return Object.values(record).some(value => 
                    String(value).toLowerCase().includes(query)
                );
            });
        }
        
        // Фильтр по застройщику
        if (this.filterDeveloper) {
            filtered = filtered.filter(record => 
                record.developer === this.filterDeveloper
            );
        }
        
        // Фильтр по категории
        if (this.filterCategory) {
            filtered = filtered.filter(record => 
                record.category === this.filterCategory
            );
        }
        
        this.filteredRecords = filtered;
        this.currentPage = 1;
        return this.filteredRecords;
    }

    /**
     * Получение записей для текущей страницы
     */
    getCurrentPageRecords() {
        const start = (this.currentPage - 1) * this.perPage;
        const end = start + this.perPage;
        return this.filteredRecords.slice(start, end);
    }

    /**
     * Получение общего количества страниц
     */
    getTotalPages() {
        return Math.ceil(this.filteredRecords.length / this.perPage);
    }

    /**
     * Добавление новой записи
     */
    addRecord(record) {
        // Форматируем телефоны
        const newRecord = {
            ...record,
            commonPhone: formatPhone(record.commonPhone),
            managerPhone: formatPhone(record.managerPhone)
        };
        
        this.records.push(newRecord);
        this.updateDevelopersSet();
        this.saveToLocalStorage();
        this.applyFilters();
        return newRecord;
    }

    /**
     * Обновление существующей записи
     */
    updateRecord(index, updatedRecord) {
        if (index >= 0 && index < this.records.length) {
            this.records[index] = {
                ...updatedRecord,
                commonPhone: formatPhone(updatedRecord.commonPhone),
                managerPhone: formatPhone(updatedRecord.managerPhone)
            };
            this.updateDevelopersSet();
            this.saveToLocalStorage();
            this.applyFilters();
            return true;
        }
        return false;
    }

    /**
     * Удаление записи
     */
    deleteRecord(index) {
        if (index >= 0 && index < this.records.length) {
            this.records.splice(index, 1);
            this.updateDevelopersSet();
            this.saveToLocalStorage();
            this.applyFilters();
            return true;
        }
        return false;
    }

    /**
     * Импорт из CSV
     */
    importFromCSV(csvText) {
        const lines = csvText.split('\n');
        if (lines.length === 0) return { imported: 0, errors: 0 };
        
        const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
        
        const newRecords = [];
        let importedCount = 0;
        let errorCount = 0;
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Парсинг CSV с учетом кавычек
            const row = [];
            let inQuotes = false;
            let current = '';
            
            for (const char of line) {
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    row.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            row.push(current.trim());
            
            // Извлекаем значения
            const developer = row[0]?.replace(/^"|"$/g, '')?.trim();
            const complex = row[1]?.replace(/^"|"$/g, '')?.trim();
            const address = row[2]?.replace(/^"|"$/g, '')?.trim() || '';
            const opAddress = row[3]?.replace(/^"|"$/g, '')?.trim() || '';
            const commonPhone = row[4]?.replace(/^"|"$/g, '')?.trim() || '';
            const manager = row[5]?.replace(/^"|"$/g, '')?.trim();
            const managerPhone = row[6]?.replace(/^"|"$/g, '')?.trim();
            const role = row[7]?.replace(/^"|"$/g, '')?.trim() || 'менеджер';
            const category = row[8]?.replace(/^"|"$/g, '')?.trim() || 'newbuild';
            
            // Пропускаем строки без застройщика или ЖК
            if (!developer || !complex) {
                errorCount++;
                continue;
            }
            
            // Очищаем названия
            const cleanDeveloper = cleanName(developer);
            const cleanComplex = cleanName(complex);
            
            // Создаем запись
            const record = {
                developer: cleanDeveloper,
                complex: cleanComplex,
                address: address,
                opAddress: opAddress,
                commonPhone: commonPhone,
                manager: manager || '',
                managerPhone: managerPhone || '',
                role: role,
                category: category
            };
            
            newRecords.push(record);
            importedCount++;
        }
        
        if (newRecords.length > 0) {
            this.records = newRecords;
            this.updateDevelopersSet();
            this.saveToLocalStorage();
            this.applyFilters();
        }
        
        return { imported: importedCount, errors: errorCount };
    }

    /**
     * Экспорт в CSV
     */
    exportToCSV() {
        const headers = ['Застройщик', 'Название ЖК', 'Адрес ЖК', 'Адрес ОП', 'Общий телефон', 'Менеджер', 'Телефон менеджера', 'Должность', 'Категория'];
        const rows = [headers];
        
        for (const record of this.records) {
            rows.push([
                `"${record.developer || ''}"`,
                `"${record.complex || ''}"`,
                `"${record.address || ''}"`,
                `"${record.opAddress || ''}"`,
                `"${record.commonPhone || ''}"`,
                `"${record.manager || ''}"`,
                `"${record.managerPhone || ''}"`,
                `"${record.role || 'менеджер'}"`,
                `"${record.category || 'newbuild'}"`
            ]);
        }
        
        return rows.map(row => row.join(',')).join('\n');
    }

    /**
     * Получение статистики
     */
    getStats() {
        const uniqueDevelopers = new Set(this.records.map(r => r.developer));
        const uniqueComplexes = new Set(this.records.map(r => `${r.developer}|${r.complex}`));
        const managersCount = this.records.filter(r => r.manager && r.manager !== 'Общий телефон').length;
        
        return {
            total: this.records.length,
            developers: uniqueDevelopers.size,
            complexes: uniqueComplexes.size,
            managers: managersCount
        };
    }
}

// ========================================
// ОСНОВНОЙ КЛАСС АДМИН-ПАНЕЛИ
// ========================================

class AdminPanel {
    constructor() {
        this.dataStore = new DataStore();
        this.currentEditIndex = null;  // Индекс редактируемой записи в оригинальном массиве
        this.editingCell = null;        // Ячейка в режиме редактирования
    }

    /**
     * Инициализация приложения
     */
    async init() {
        // Загружаем данные
        this.dataStore.loadFromLocalStorage();
        this.dataStore.applyFilters();
        
        // Настраиваем UI
        this.populateDeveloperFilter();
        this.populateDeveloperDatalist();
        this.renderTable();
        this.updateStats();
        this.setupEventListeners();
        
        console.log('✅ Админ-панель инициализирована');
    }

    /**
     * Заполнение фильтра застройщиков
     */
    populateDeveloperFilter() {
        const select = document.getElementById('filterDeveloper');
        if (!select) return;
        
        select.innerHTML = '<option value="">Все застройщики</option>';
        const developers = Array.from(this.dataStore.developersSet).sort();
        
        for (const dev of developers) {
            const option = document.createElement('option');
            option.value = dev;
            option.textContent = dev;
            select.appendChild(option);
        }
    }

    /**
     * Заполнение datalist застройщиков для формы
     */
    populateDeveloperDatalist() {
        const datalist = document.getElementById('developersDatalist');
        if (!datalist) return;
        
        datalist.innerHTML = '';
        const developers = Array.from(this.dataStore.developersSet).sort();
        
        for (const dev of developers) {
            const option = document.createElement('option');
            option.value = dev;
            datalist.appendChild(option);
        }
    }

    /**
     * Обновление статистики
     */
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

    /**
     * Отрисовка таблицы
     */
    renderTable() {
        const tbody = document.getElementById('tableBody');
        if (!tbody) return;
        
        const records = this.dataStore.getCurrentPageRecords();
        const startIndex = (this.dataStore.currentPage - 1) * this.dataStore.perPage;
        
        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 40px;">📭 Нет данных</td></tr>';
            this.updatePaginationButtons();
            return;
        }
        
        tbody.innerHTML = records.map((record, idx) => {
            const globalIndex = startIndex + idx;
            const categoryIcon = record.category === 'suburban' ? '🏡' : '🏢';
            const categoryText = record.category === 'suburban' ? 'Загородная' : 'Новостройка';
            
            return `
                <tr data-index="${globalIndex}">
                    <td class="editable" data-field="developer">${escapeHtml(record.developer)}</td>
                    <td class="editable" data-field="complex">${escapeHtml(record.complex)}</td>
                    <td class="editable" data-field="address">${escapeHtml(record.address) || '-'}</td>
                    <td class="editable" data-field="opAddress">${escapeHtml(record.opAddress) || '-'}</td>
                    <td class="editable" data-field="commonPhone">${escapeHtml(record.commonPhone) || '-'}</td>
                    <td class="editable" data-field="manager">${escapeHtml(record.manager) || '-'}</td>
                    <td class="editable" data-field="managerPhone">${escapeHtml(record.managerPhone) || '-'}</td>
                    <td class="editable" data-field="role">${escapeHtml(record.role)}</td>
                    <td class="editable" data-field="category">${categoryIcon} ${categoryText}</td>
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

    /**
     * Прикрепление обработчиков к таблице
     */
    attachTableEventListeners() {
        // Редактирование ячеек
        const editableCells = document.querySelectorAll('.editable');
        editableCells.forEach(cell => {
            cell.removeEventListener('click', this.handleCellClick);
            cell.addEventListener('click', this.handleCellClick.bind(this));
        });
        
        // Кнопки редактирования строки
        const editButtons = document.querySelectorAll('.edit-row-btn');
        editButtons.forEach(btn => {
            btn.removeEventListener('click', this.handleEditRow);
            btn.addEventListener('click', this.handleEditRow.bind(this));
        });
        
        // Кнопки удаления
        const deleteButtons = document.querySelectorAll('.delete-row-btn');
        deleteButtons.forEach(btn => {
            btn.removeEventListener('click', this.handleDeleteRow);
            btn.addEventListener('click', this.handleDeleteRow.bind(this));
        });
    }

    /**
     * Обработчик клика по ячейке (inline-редактирование)
     */
    handleCellClick(event) {
        const cell = event.currentTarget;
        const row = cell.closest('tr');
        const globalIndex = parseInt(row.dataset.index);
        const field = cell.dataset.field;
        const currentValue = cell.textContent.trim() === '-' ? '' : cell.textContent.trim();
        
        // Сохраняем текущую ячейку для отмены
        this.editingCell = { cell, globalIndex, field, oldValue: currentValue };
        
        // Создаем input или select
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
                <option value="специалист по работе с партнерами" ${currentValue === 'специалист по работе с партнерами' ? 'selected' : ''}>Специалист по работе с партнерами</option>
            `;
        } else {
            input = document.createElement('input');
            input.type = 'text';
            input.value = currentValue === '-' ? '' : currentValue;
        }
        
        cell.classList.add('editing');
        cell.textContent = '';
        cell.appendChild(input);
        input.focus();
        
        const saveEdit = () => {
            const newValue = input.value;
            cell.classList.remove('editing');
            
            // Обновляем данные
            const record = this.dataStore.records[globalIndex];
            if (record) {
                let saveValue = newValue;
                if (field === 'category') {
                    saveValue = newValue;
                }
                record[field] = saveValue;
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

    /**
     * Обработчик редактирования строки (загрузка в форму)
     */
    handleEditRow(event) {
        const btn = event.currentTarget;
        const row = btn.closest('tr');
        const globalIndex = parseInt(row.dataset.index);
        const record = this.dataStore.records[globalIndex];
        
        if (record) {
            this.currentEditIndex = globalIndex;
            this.loadRecordToForm(record);
            
            const formTitle = document.getElementById('formTitle');
            if (formTitle) {
                formTitle.innerHTML = '<i class="fas fa-edit"></i> Редактирование записи';
            }
            
            // Прокручиваем к форме
            document.getElementById('formSection')?.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * Обработчик удаления строки
     */
    handleDeleteRow(event) {
        const btn = event.currentTarget;
        const row = btn.closest('tr');
        const globalIndex = parseInt(row.dataset.index);
        
        if (confirm('🗑️ Удалить эту запись?')) {
            this.dataStore.deleteRecord(globalIndex);
            this.renderTable();
            this.updateStats();
            this.populateDeveloperFilter();
            this.populateDeveloperDatalist();
            showToast('✅ Запись удалена');
        }
    }

    /**
     * Загрузка записи в форму
     */
    loadRecordToForm(record) {
        const developerInput = document.getElementById('formDeveloper');
        const complexInput = document.getElementById('formComplex');
        const addressInput = document.getElementById('formAddress');
        const opAddressInput = document.getElementById('formOpAddress');
        const commonPhoneInput = document.getElementById('formCommonPhone');
        const managerInput = document.getElementById('formManager');
        const managerPhoneInput = document.getElementById('formManagerPhone');
        const roleSelect = document.getElementById('formRole');
        const categorySelect = document.getElementById('formCategory');
        
        if (developerInput) developerInput.value = record.developer || '';
        if (complexInput) complexInput.value = record.complex || '';
        if (addressInput) addressInput.value = record.address || '';
        if (opAddressInput) opAddressInput.value = record.opAddress || '';
        if (commonPhoneInput) commonPhoneInput.value = record.commonPhone || '';
        if (managerInput) managerInput.value = record.manager || '';
        if (managerPhoneInput) managerPhoneInput.value = record.managerPhone || '';
        if (roleSelect) roleSelect.value = record.role || 'менеджер';
        if (categorySelect) categorySelect.value = record.category || 'newbuild';
    }

    /**
     * Получение данных из формы
     */
    getFormData() {
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

    /**
     * Очистка формы
     */
    clearForm() {
        const fields = ['formDeveloper', 'formComplex', 'formAddress', 'formOpAddress', 'formCommonPhone', 'formManager', 'formManagerPhone'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        
        const roleSelect = document.getElementById('formRole');
        if (roleSelect) roleSelect.value = 'менеджер';
        
        const categorySelect = document.getElementById('formCategory');
        if (categorySelect) categorySelect.value = 'newbuild';
        
        this.currentEditIndex = null;
        
        const formTitle = document.getElementById('formTitle');
        if (formTitle) {
            formTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Новая запись';
        }
    }

    /**
     * Сохранение записи из формы
     */
    saveForm() {
        const formData = this.getFormData();
        
        // Валидация
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
        
        // Форматируем телефоны
        formData.commonPhone = formatPhone(formData.commonPhone);
        formData.managerPhone = formatPhone(formData.managerPhone);
        
        if (this.currentEditIndex !== null) {
            // Обновление существующей записи
            this.dataStore.updateRecord(this.currentEditIndex, formData);
            showToast('✅ Запись обновлена');
        } else {
            // Добавление новой записи
            this.dataStore.addRecord(formData);
            showToast('✅ Новая запись добавлена');
        }
        
        this.clearForm();
        this.renderTable();
        this.updateStats();
        this.populateDeveloperFilter();
        this.populateDeveloperDatalist();
    }

    /**
     * Обновление информации о странице
     */
    updatePageInfo() {
        const pageInfo = document.getElementById('pageInfo');
        if (pageInfo) {
            pageInfo.textContent = `Страница ${this.dataStore.currentPage} из ${this.dataStore.getTotalPages() || 1}`;
        }
    }

    /**
     * Обновление состояния кнопок пагинации
     */
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

    /**
     * Переход на страницу
     */
    goToPage(page) {
        const totalPages = this.dataStore.getTotalPages();
        if (page < 1 || page > totalPages) return;
        
        this.dataStore.currentPage = page;
        this.renderTable();
    }

    /**
     * Импорт CSV
     */
    importCSV(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = this.dataStore.importFromCSV(e.target.result);
            this.renderTable();
            this.updateStats();
            this.populateDeveloperFilter();
            this.populateDeveloperDatalist();
            
            if (result.errors > 0) {
                showToast(`✅ Импортировано ${result.imported} записей. Пропущено: ${result.errors}`, false);
            } else {
                showToast(`✅ Импортировано ${result.imported} записей`);
            }
        };
        reader.onerror = () => {
            showToast('❌ Ошибка чтения файла', true);
        };
        reader.readAsText(file, 'UTF-8');
    }

    /**
     * Экспорт CSV
     */
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

    /**
     * Экспорт Excel
     */
    exportExcel() {
        const data = this.dataStore.records.map(record => ({
            'Застройщик': record.developer,
            'Название ЖК': record.complex,
            'Адрес ЖК': record.address,
            'Адрес ОП': record.opAddress,
            'Общий телефон': record.commonPhone,
            'Менеджер': record.manager,
            'Телефон менеджера': record.managerPhone,
            'Должность': record.role,
            'Категория': record.category === 'suburban' ? 'Загородная' : 'Новостройка'
        }));
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Контакты ЖК');
        XLSX.writeFile(wb, `contacts_${new Date().toISOString().slice(0, 19)}.xlsx`);
        showToast('📎 Excel файл скачан');
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Поиск
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.dataStore.searchQuery = e.target.value;
                this.dataStore.applyFilters();
                this.renderTable();
                this.updateStats();
            });
        }
        
        // Фильтр по застройщику
        const filterDeveloper = document.getElementById('filterDeveloper');
        if (filterDeveloper) {
            filterDeveloper.addEventListener('change', (e) => {
                this.dataStore.filterDeveloper = e.target.value;
                this.dataStore.applyFilters();
                this.renderTable();
                this.updateStats();
            });
        }
        
        // Фильтр по категории
        const filterCategory = document.getElementById('filterCategory');
        if (filterCategory) {
            filterCategory.addEventListener('change', (e) => {
                this.dataStore.filterCategory = e.target.value;
                this.dataStore.applyFilters();
                this.renderTable();
                this.updateStats();
            });
        }
        
        // Сброс фильтров
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
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
            });
        }
        
        // Пагинация
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
        
        // Кнопки импорта/экспорта
        const importBtn = document.getElementById('importCsvBtn');
        const importFileInput = document.getElementById('importFileInput');
        const exportCsvBtn = document.getElementById('exportCsvBtn');
        const exportExcelBtn = document.getElementById('exportExcelBtn');
        
        if (importBtn && importFileInput) {
            importBtn.addEventListener('click', () => importFileInput.click());
            importFileInput.addEventListener('change', (e) => {
                if (e.target.files[0]) this.importCSV(e.target.files[0]);
                importFileInput.value = '';
            });
        }
        
        if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => this.exportCSV());
        if (exportExcelBtn) exportExcelBtn.addEventListener('click', () => this.exportExcel());
        
        // Форма
        const saveFormBtn = document.getElementById('saveFormBtn');
        const clearFormBtn = document.getElementById('clearFormBtn');
        
        if (saveFormBtn) saveFormBtn.addEventListener('click', () => this.saveForm());
        if (clearFormBtn) clearFormBtn.addEventListener('click', () => this.clearForm());
        
        // Автоформат телефонов в форме
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
    }
}

// ========================================
// ЗАПУСК ПРИЛОЖЕНИЯ
// ========================================

const adminPanel = new AdminPanel();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => adminPanel.init());
} else {
    adminPanel.init();
}

export default adminPanel;
