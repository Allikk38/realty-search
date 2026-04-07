/**
 * Модуль управления контактами ЖК
 * Версия: 2.0
 * Описание: Админ-панель для управления контактами застройщиков и ЖК
 */

// ========== СОСТОЯНИЕ ПРИЛОЖЕНИЯ (ЗАКРЫТОЕ) ==========
let state = {
    database: {
        developers: {}, // { "Застройщик": { id, complexes: [], address, commonPhone, opAddress, category } }
        contacts: []    // [{ developer, complex, name, phone, role }]
    },
    editMode: false,
    editId: null
};

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

/**
 * Экранирование HTML специальных символов
 * @param {string} str - Входная строка
 * @returns {string} - Экранированная строка
 */
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
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
function formatPhone(phone) {
    if (!phone || phone === 'Общий телефон' || phone === 'Телефон ОП') return '';
    
    let cleaned = String(phone).replace(/[^\d+]/g, '');
    
    if (cleaned.startsWith('8') && cleaned.length === 11) {
        cleaned = '+7' + cleaned.slice(1);
    }
    if (cleaned.startsWith('7') && cleaned.length === 11 && !cleaned.startsWith('+')) {
        cleaned = '+' + cleaned;
    }
    if (cleaned.length === 10 && !cleaned.startsWith('+')) {
        cleaned = '+7' + cleaned;
    }
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
function showToast(message, isError = false) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.background = isError ? 'rgba(239, 68, 68, 0.9)' : 'rgba(0, 0, 0, 0.9)';
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ========== РАБОТА С ХРАНИЛИЩЕМ ==========

/**
 * Сохранение данных в localStorage
 */
function saveData() {
    localStorage.setItem('contactsDatabase', JSON.stringify(state.database));
    updateStats();
    populateDatalists();
}

/**
 * Загрузка данных из localStorage
 */
function loadData() {
    const saved = localStorage.getItem('contactsDatabase');
    if (saved) {
        try {
            state.database = JSON.parse(saved);
        } catch(e) {
            console.error('Ошибка загрузки', e);
            initDemoData();
        }
    } else {
        initDemoData();
    }
}

/**
 * Инициализация демонстрационных данных
 */
function initDemoData() {
    state.database = {
        developers: {
            "Расцветай": {
                id: "dev_1",
                complexes: ["Эко-квартал на Кедровой", "Расцветай на Красном", "Сакура Парк", "Расцветай на Зорге"],
                address: "",
                commonPhone: "+7(383) 255-88-22",
                opAddress: "",
                category: "newbuild"
            },
            "VIRA (Вира)": {
                id: "dev_2",
                complexes: ["CITATUM (Цитатум)"],
                address: "",
                commonPhone: "+7 (383) 271-22-22",
                opAddress: "ул.Фрунзе 63",
                category: "newbuild"
            },
            "Брусника. Сибакадемстрой": {
                id: "dev_3",
                complexes: ["Европейский Берег", "Авиатор", "Пшеница", "Мылзавод", "Квартал на Декабристов", "Лебедевский", "Город-на-озере"],
                address: "",
                commonPhone: "",
                opAddress: "",
                category: "newbuild"
            }
        },
        contacts: [
            { developer: "Расцветай", complex: "Эко-квартал на Кедровой", name: "Данил Швец", phone: "+7 961 873-63-10", role: "менеджер" },
            { developer: "Расцветай", complex: "Эко-квартал на Кедровой", name: "Александра Гаммель", phone: "+7 961 848-39-56", role: "менеджер" },
            { developer: "Расцветай", complex: "Расцветай на Красном", name: "Денис Бородин", phone: "+7 960 792-82-68", role: "менеджер" },
            { developer: "VIRA (Вира)", complex: "CITATUM (Цитатум)", name: "Екатерина Рольгайзер", phone: "+7 913 723-00-37", role: "специалист по работе с партнерами" },
            { developer: "Брусника. Сибакадемстрой", complex: "Авиатор", name: "Максим Попов", phone: "+7 999 463 3627", role: "менеджер" },
            { developer: "Брусника. Сибакадемстрой", complex: "Авиатор", name: "Виктор Павлов", phone: "+7 913 627 5181", role: "менеджер" }
        ]
    };
    saveData();
}

// ========== ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ==========

/**
 * Обновление статистики на панели
 */
function updateStats() {
    const developersCount = Object.keys(state.database.developers).length;
    const complexesCount = Object.values(state.database.developers).reduce((sum, dev) => sum + dev.complexes.length, 0);
    const contactsCount = state.database.contacts.length;
    
    const devCountEl = document.getElementById('developersCount');
    const complexCountEl = document.getElementById('complexesCount');
    const contactsCountEl = document.getElementById('contactsCount');
    
    if (devCountEl) devCountEl.textContent = developersCount;
    if (complexCountEl) complexCountEl.textContent = complexesCount;
    if (contactsCountEl) contactsCountEl.textContent = contactsCount;
}

/**
 * Заполнение выпадающих списков
 */
function populateDatalists() {
    const developersList = document.getElementById('developersList');
    if (developersList) {
        developersList.innerHTML = '';
        Object.keys(state.database.developers).forEach(dev => {
            const option = document.createElement('option');
            option.value = dev;
            developersList.appendChild(option);
        });
    }
    
    const complexesList = document.getElementById('complexesList');
    if (complexesList) {
        complexesList.innerHTML = '';
        Object.values(state.database.developers).forEach(dev => {
            dev.complexes.forEach(complex => {
                const option = document.createElement('option');
                option.value = complex;
                complexesList.appendChild(option);
            });
        });
    }
}

/**
 * Создание элемента менеджера для формы
 * @returns {HTMLElement} - DOM элемент менеджера
 */
function createManagerItem() {
    const div = document.createElement('div');
    div.className = 'manager-item';
    div.innerHTML = `
        <input type="text" placeholder="Имя менеджера" class="manager-name">
        <input type="text" placeholder="Телефон" class="manager-phone">
        <select class="manager-role">
            <option value="менеджер">Менеджер</option>
            <option value="руководитель ОП">Руководитель ОП</option>
            <option value="специалист по работе с партнерами">Специалист по работе с партнерами</option>
        </select>
        <button class="btn btn-danger remove-manager" style="padding: 8px 16px;">
            <i class="fas fa-trash"></i>
        </button>
    `;
    div.querySelector('.remove-manager').addEventListener('click', () => div.remove());
    return div;
}

/**
 * Сброс формы добавления/редактирования
 */
function resetForm() {
    state.editMode = false;
    state.editId = null;
    
    const formTitle = document.getElementById('formTitle');
    const developerInput = document.getElementById('developerInput');
    const complexInput = document.getElementById('complexInput');
    const addressInput = document.getElementById('addressInput');
    const opAddressInput = document.getElementById('opAddressInput');
    const commonPhoneInput = document.getElementById('commonPhoneInput');
    const formPanel = document.getElementById('formPanel');
    const showFormBtn = document.getElementById('showFormBtn');
    const managersContainer = document.getElementById('managersContainer');
    
    if (formTitle) formTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Добавление контакта';
    if (developerInput) developerInput.value = '';
    if (complexInput) complexInput.value = '';
    if (addressInput) addressInput.value = '';
    if (opAddressInput) opAddressInput.value = '';
    if (commonPhoneInput) commonPhoneInput.value = '';
    
    if (managersContainer) {
        managersContainer.innerHTML = '';
        managersContainer.appendChild(createManagerItem());
    }
    
    if (formPanel) formPanel.classList.remove('active');
    if (showFormBtn) showFormBtn.style.display = 'inline-flex';
}

// ========== БИЗНЕС-ЛОГИКА ==========

/**
 * Добавление или получение застройщика
 * @param {string} developerName - Название застройщика
 * @returns {Object} - Объект застройщика
 */
function addOrGetDeveloper(developerName) {
    if (!state.database.developers[developerName]) {
        state.database.developers[developerName] = {
            id: 'dev_' + Date.now(),
            complexes: [],
            address: '',
            commonPhone: '',
            opAddress: '',
            category: 'newbuild'
        };
        saveData();
        showToast(`✅ Добавлен новый застройщик: ${developerName}`);
    }
    return state.database.developers[developerName];
}

/**
 * Добавление ЖК к застройщику
 * @param {string} developerName - Название застройщика
 * @param {string} complexName - Название ЖК
 * @returns {boolean} - Успех операции
 */
function addComplexToDeveloper(developerName, complexName) {
    const developer = state.database.developers[developerName];
    if (developer && !developer.complexes.includes(complexName)) {
        developer.complexes.push(complexName);
        saveData();
        showToast(`✅ Добавлен новый ЖК: ${complexName} (${developerName})`);
        return true;
    }
    return false;
}

/**
 * Сохранение контакта из формы
 */
function saveContact() {
    const developerInput = document.getElementById('developerInput');
    const complexInput = document.getElementById('complexInput');
    const addressInput = document.getElementById('addressInput');
    const opAddressInput = document.getElementById('opAddressInput');
    const commonPhoneInput = document.getElementById('commonPhoneInput');
    
    const developer = developerInput?.value.trim() || '';
    const complex = complexInput?.value.trim() || '';
    const address = addressInput?.value.trim() || '';
    const opAddress = opAddressInput?.value.trim() || '';
    const commonPhone = formatPhone(commonPhoneInput?.value.trim() || '');
    
    if (!developer) {
        showToast('❌ Введите название застройщика', true);
        return;
    }
    if (!complex) {
        showToast('❌ Введите название ЖК', true);
        return;
    }
    
    // Добавляем застройщика и ЖК в базу
    addOrGetDeveloper(developer);
    addComplexToDeveloper(developer, complex);
    
    const devData = state.database.developers[developer];
    
    // Обновляем доп. информацию о застройщике
    if (address && devData.address !== address) devData.address = address;
    if (opAddress && devData.opAddress !== opAddress) devData.opAddress = opAddress;
    if (commonPhone && devData.commonPhone !== commonPhone) devData.commonPhone = commonPhone;
    
    // Сохраняем менеджеров
    const managerItems = document.querySelectorAll('.manager-item');
    let savedCount = 0;
    
    managerItems.forEach(item => {
        const name = item.querySelector('.manager-name')?.value.trim() || '';
        const phone = formatPhone(item.querySelector('.manager-phone')?.value.trim() || '');
        const role = item.querySelector('.manager-role')?.value || 'менеджер';
        
        if (name && phone) {
            const exists = state.database.contacts.some(c => 
                c.developer === developer && 
                c.complex === complex && 
                c.name === name
            );
            
            if (!exists) {
                state.database.contacts.push({ developer, complex, name, phone, role });
                savedCount++;
            }
        }
    });
    
    saveData();
    showToast(`✅ Сохранено: ${savedCount} контакт(ов) для ${complex}`);
    resetForm();
    renderTable();
}

/**
 * Редактирование контакта
 * @param {number} index - Индекс контакта в массиве
 */
function editContact(index) {
    const contact = state.database.contacts[index];
    if (!contact) return;
    
    state.editMode = true;
    state.editId = index;
    
    const formTitle = document.getElementById('formTitle');
    const developerInput = document.getElementById('developerInput');
    const complexInput = document.getElementById('complexInput');
    const addressInput = document.getElementById('addressInput');
    const opAddressInput = document.getElementById('opAddressInput');
    const commonPhoneInput = document.getElementById('commonPhoneInput');
    const managersContainer = document.getElementById('managersContainer');
    const formPanel = document.getElementById('formPanel');
    const showFormBtn = document.getElementById('showFormBtn');
    
    if (formTitle) formTitle.innerHTML = '<i class="fas fa-edit"></i> Редактирование контакта';
    if (developerInput) developerInput.value = contact.developer;
    if (complexInput) complexInput.value = contact.complex;
    
    const dev = state.database.developers[contact.developer];
    if (dev) {
        if (addressInput) addressInput.value = dev.address || '';
        if (opAddressInput) opAddressInput.value = dev.opAddress || '';
        if (commonPhoneInput) commonPhoneInput.value = dev.commonPhone || '';
    }
    
    if (managersContainer) {
        managersContainer.innerHTML = '';
        const managerItem = createManagerItem();
        managerItem.querySelector('.manager-name').value = contact.name;
        managerItem.querySelector('.manager-phone').value = contact.phone;
        managerItem.querySelector('.manager-role').value = contact.role;
        managersContainer.appendChild(managerItem);
    }
    
    if (formPanel) formPanel.classList.add('active');
    if (showFormBtn) showFormBtn.style.display = 'none';
}

/**
 * Удаление контакта
 * @param {number} index - Индекс контакта в массиве
 */
function deleteContact(index) {
    if (confirm('Удалить этот контакт?')) {
        state.database.contacts.splice(index, 1);
        saveData();
        renderTable();
        showToast('🗑️ Контакт удален');
    }
}

// ========== ОТОБРАЖЕНИЕ ТАБЛИЦЫ ==========

/**
 * Отрисовка таблицы с данными
 */
function renderTable() {
    const tbody = document.getElementById('tableBody');
    const searchInput = document.getElementById('searchInput');
    const filterTypeSelect = document.getElementById('filterType');
    
    if (!tbody) return;
    
    const searchTerm = searchInput?.value.toLowerCase() || '';
    const filterType = filterTypeSelect?.value || 'all';
    
    let filteredContacts = [...state.database.contacts];
    
    if (searchTerm) {
        filteredContacts = filteredContacts.filter(c => 
            c.developer.toLowerCase().includes(searchTerm) ||
            c.complex.toLowerCase().includes(searchTerm) ||
            c.name.toLowerCase().includes(searchTerm) ||
            c.phone.includes(searchTerm)
        );
    }
    
    if (filterType === 'developer') {
        const uniqueDevs = [...new Set(filteredContacts.map(c => c.developer))];
        tbody.innerHTML = uniqueDevs.map(dev => `
            <tr>
                <td>${escapeHtml(dev)}</td>
                <td colspan="5">${state.database.developers[dev]?.complexes.join(', ') || '-'}</td>
            </tr>
        `).join('');
        return;
    }
    
    if (filterType === 'complex') {
        const uniqueComplexes = [...new Set(filteredContacts.map(c => `${c.developer}|${c.complex}`))];
        tbody.innerHTML = uniqueComplexes.map(key => {
            const [dev, comp] = key.split('|');
            return `
                <tr>
                    <td>${escapeHtml(dev)}</td>
                    <td colspan="5">${escapeHtml(comp)}</td>
                </tr>
            `;
        }).join('');
        return;
    }
    
    if (filteredContacts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Нет данных</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredContacts.map((contact) => {
        const devData = state.database.developers[contact.developer];
        const currentIndex = state.database.contacts.indexOf(contact);
        return `
            <tr>
                <td>${escapeHtml(contact.developer)}</td>
                <td>${escapeHtml(contact.complex)}</td>
                <td>${escapeHtml(devData?.address || '-')}</td>
                <td>${escapeHtml(devData?.commonPhone || '-')}</td>
                <td>${escapeHtml(contact.name)}<br><small>${escapeHtml(contact.phone)}</small><br><span style="color:#a78bfa">${escapeHtml(contact.role)}</span></td>
                <td class="action-btns">
                    <button class="btn btn-secondary" onclick="window.editContact(${currentIndex})" style="padding: 6px 12px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="window.deleteContact(${currentIndex})" style="padding: 6px 12px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ========== ЭКСПОРТ/ИМПОРТ CSV ==========

/**
 * Экспорт данных в CSV файл
 */
function exportToCSV() {
    let csv = "Застройщик,Название ЖК,Адрес ЖК,Адрес ОП,Общий телефон,Менеджер,Телефон менеджера,Должность,Категория\n";
    
    for (const [developer, devData] of Object.entries(state.database.developers)) {
        for (const complex of devData.complexes) {
            if (devData.commonPhone) {
                csv += `"${developer}","${complex}","${devData.address || ''}","${devData.opAddress || ''}","${devData.commonPhone}",Общий телефон,,менеджер,${devData.category || 'newbuild'}\n`;
            }
            
            const complexContacts = state.database.contacts.filter(c => c.developer === developer && c.complex === complex);
            for (const contact of complexContacts) {
                csv += `"${developer}","${complex}","${devData.address || ''}","${devData.opAddress || ''}","${devData.commonPhone || ''}","${contact.name}","${contact.phone}","${contact.role}",${devData.category || 'newbuild'}\n`;
            }
        }
    }
    
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'contacts_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('📥 CSV файл скачан');
}

/**
 * Импорт данных из CSV
 * @param {string} csvContent - Содержимое CSV файла
 */
function importFromCSV(csvContent) {
    try {
        const lines = csvContent.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
        
        const colIndex = {
            developer: headers.findIndex(h => h.includes('Застройщик')),
            complex: headers.findIndex(h => h.includes('Название ЖК') || h.includes('ЖК')),
            address: headers.findIndex(h => h.includes('Адрес ЖК')),
            opAddress: headers.findIndex(h => h.includes('Адрес ОП')),
            commonPhone: headers.findIndex(h => h.includes('Общий телефон')),
            manager: headers.findIndex(h => h.includes('Менеджер')),
            managerPhone: headers.findIndex(h => h.includes('Телефон менеджера')),
            role: headers.findIndex(h => h.includes('Должность')),
            category: headers.findIndex(h => h.includes('Категория'))
        };
        
        const newDatabase = { developers: {}, contacts: [] };
        let importedCount = 0;
        let skippedCount = 0;
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
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
            
            let developer = row[colIndex.developer]?.replace(/^"|"$/g, '').trim();
            let complex = row[colIndex.complex]?.replace(/^"|"$/g, '').trim();
            const address = row[colIndex.address]?.replace(/^"|"$/g, '').trim() || '';
            const opAddress = row[colIndex.opAddress]?.replace(/^"|""$/g, '').trim() || '';
            let commonPhone = row[colIndex.commonPhone]?.replace(/^"|"$/g, '').trim() || '';
            let manager = row[colIndex.manager]?.replace(/^"|"$/g, '').trim();
            let managerPhone = row[colIndex.managerPhone]?.replace(/^"|"$/g, '').trim();
            const role = row[colIndex.role]?.replace(/^"|"$/g, '').trim() || 'менеджер';
            const category = row[colIndex.category]?.replace(/^"|"$/g, '').trim() || 'newbuild';
            
            if (!developer || !complex) continue;
            
            developer = developer.replace(/Сайт|ТГ-канал|Realt.one/g, '').replace(/\s{2,}/g, ' ').trim();
            complex = complex.replace(/Сайт|ТГ-канал|Realt.one/g, '').replace(/\s{2,}/g, ' ').trim();
            
            if (commonPhone && commonPhone !== 'Общий телефон' && commonPhone !== 'Телефон ОП') {
                commonPhone = formatPhone(commonPhone);
            } else {
                commonPhone = '';
            }
            
            if (managerPhone && managerPhone !== 'Общий телефон' && managerPhone !== 'Телефон ОП') {
                managerPhone = formatPhone(managerPhone);
            }
            
            if (!newDatabase.developers[developer]) {
                newDatabase.developers[developer] = {
                    id: 'dev_' + Date.now() + '_' + Math.random(),
                    complexes: [],
                    address: address,
                    opAddress: opAddress,
                    commonPhone: commonPhone,
                    category: category
                };
            }
            
            const devData = newDatabase.developers[developer];
            
            if (!devData.complexes.includes(complex)) {
                devData.complexes.push(complex);
            }
            
            if (address && !devData.address) devData.address = address;
            if (opAddress && !devData.opAddress) devData.opAddress = opAddress;
            if (commonPhone && !devData.commonPhone) devData.commonPhone = commonPhone;
            
            if (manager && manager !== 'Общий телефон' && manager !== 'Телефон ОП' && managerPhone) {
                const exists = newDatabase.contacts.some(c => 
                    c.developer === developer && 
                    c.complex === complex && 
                    c.name === manager
                );
                
                if (!exists) {
                    newDatabase.contacts.push({
                        developer: developer,
                        complex: complex,
                        name: manager,
                        phone: managerPhone,
                        role: role
                    });
                    importedCount++;
                } else {
                    skippedCount++;
                }
            }
        }
        
        state.database = newDatabase;
        saveData();
        updateStats();
        renderTable();
        populateDatalists();
        
        showToast(`✅ Импорт завершен! Добавлено: ${importedCount} контактов. Пропущено дублей: ${skippedCount}`);
        
    } catch (err) {
        console.error('Ошибка импорта:', err);
        showToast('❌ Ошибка при импорте CSV. Проверьте формат файла.', true);
    }
}

/**
 * Настройка импорта CSV
 */
function setupImport() {
    const importBtn = document.getElementById('importBtn');
    const importFileInput = document.getElementById('importFileInput');
    
    if (!importBtn) return;
    
    importBtn.addEventListener('click', () => {
        importFileInput?.click();
    });
    
    if (importFileInput) {
        importFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(event) {
                importFromCSV(event.target.result);
            };
            reader.readAsText(file, 'UTF-8');
            importFileInput.value = '';
        });
    }
}

// ========== НАСТРОЙКА СОБЫТИЙ ==========

/**
 * Инициализация обработчиков событий
 */
function setupEventListeners() {
    const showFormBtn = document.getElementById('showFormBtn');
    const cancelFormBtn = document.getElementById('cancelFormBtn');
    const saveContactBtn = document.getElementById('saveContactBtn');
    const addManagerBtn = document.getElementById('addManagerBtn');
    const exportBtn = document.getElementById('exportBtn');
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    const filterType = document.getElementById('filterType');
    
    if (showFormBtn) {
        showFormBtn.addEventListener('click', () => {
            resetForm();
            const formPanel = document.getElementById('formPanel');
            if (formPanel) formPanel.classList.add('active');
            showFormBtn.style.display = 'none';
        });
    }
    
    if (cancelFormBtn) cancelFormBtn.addEventListener('click', resetForm);
    if (saveContactBtn) saveContactBtn.addEventListener('click', saveContact);
    if (exportBtn) exportBtn.addEventListener('click', exportToCSV);
    if (searchBtn) searchBtn.addEventListener('click', () => renderTable());
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') renderTable();
        });
    }
    if (filterType) filterType.addEventListener('change', () => renderTable());
    
    if (addManagerBtn) {
        addManagerBtn.addEventListener('click', () => {
            const container = document.getElementById('managersContainer');
            if (container) container.appendChild(createManagerItem());
        });
    }
    
    setupImport();
}

// ========== ЭКСПОРТ ГЛОБАЛЬНЫХ ФУНКЦИЙ (ДЛЯ ONCLICK) ==========
window.editContact = editContact;
window.deleteContact = deleteContact;

// ========== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    updateStats();
    renderTable();
    populateDatalists();
});
