// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let database = {
    developers: {}, // { "Застройщик": { id, complexes: [], address, commonPhone, opAddress } }
    contacts: []    // [{ developer, complex, name, phone, role }]
};

let editMode = false;
let editId = null;

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    updateStats();
    renderTable();
    populateDatalists();
});

// ========== ЗАГРУЗКА/СОХРАНЕНИЕ ДАННЫХ ==========
function loadData() {
    const saved = localStorage.getItem('contactsDatabase');
    if (saved) {
        try {
            database = JSON.parse(saved);
        } catch(e) {
            console.error('Ошибка загрузки', e);
            initDemoData();
        }
    } else {
        initDemoData();
    }
}

function initDemoData() {
    // Демо-данные из вашей таблицы
    database = {
        developers: {
            "Расцветай": {
                id: "dev_1",
                complexes: ["Эко-квартал на Кедровой", "Расцветай на Красном", "Сакура Парк", "Расцветай на Зорге"],
                address: "",
                commonPhone: "+7(383) 255-88-22",
                opAddress: ""
            },
            "VIRA (Вира)": {
                id: "dev_2",
                complexes: ["CITATUM (Цитатум)"],
                address: "",
                commonPhone: "+7 (383) 271-22-22",
                opAddress: "ул.Фрунзе 63"
            },
            "Брусника. Сибакадемстрой": {
                id: "dev_3",
                complexes: ["Европейский Берег", "Авиатор", "Пшеница", "Мылзавод", "Квартал на Декабристов", "Лебедевский", "Город-на-озере"],
                address: "",
                commonPhone: "",
                opAddress: ""
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

function saveData() {
    localStorage.setItem('contactsDatabase', JSON.stringify(database));
    updateStats();
    populateDatalists();
}

// ========== ОБНОВЛЕНИЕ СТАТИСТИКИ ==========
function updateStats() {
    const developersCount = Object.keys(database.developers).length;
    const complexesCount = Object.values(database.developers).reduce((sum, dev) => sum + dev.complexes.length, 0);
    const contactsCount = database.contacts.length;
    
    document.getElementById('developersCount').textContent = developersCount;
    document.getElementById('complexesCount').textContent = complexesCount;
    document.getElementById('contactsCount').textContent = contactsCount;
}

// ========== ЗАПОЛНЕНИЕ СПИСКОВ ==========
function populateDatalists() {
    const developersList = document.getElementById('developersList');
    developersList.innerHTML = '';
    Object.keys(database.developers).forEach(dev => {
        const option = document.createElement('option');
        option.value = dev;
        developersList.appendChild(option);
    });
    
    const complexesList = document.getElementById('complexesList');
    complexesList.innerHTML = '';
    Object.values(database.developers).forEach(dev => {
        dev.complexes.forEach(complex => {
            const option = document.createElement('option');
            option.value = complex;
            complexesList.appendChild(option);
        });
    });
}

// ========== ФОРМАТИРОВАНИЕ ТЕЛЕФОНА ==========
function formatPhone(phone) {
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('8') && cleaned.length === 11) {
        cleaned = '+7' + cleaned.slice(1);
    }
    if (cleaned.startsWith('7') && cleaned.length === 11 && !cleaned.startsWith('+')) {
        cleaned = '+' + cleaned;
    }
    if (cleaned.length === 12 && cleaned.startsWith('+7')) {
        return cleaned.replace(/(\+7)(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3-$4-$5');
    }
    return phone;
}

// ========== ДОБАВЛЕНИЕ НОВОГО ЗАСТРОЙЩИКА/ЖК ==========
function addOrGetDeveloper(developerName) {
    if (!database.developers[developerName]) {
        database.developers[developerName] = {
            id: 'dev_' + Date.now(),
            complexes: [],
            address: '',
            commonPhone: '',
            opAddress: ''
        };
        saveData();
        showToast(`✅ Добавлен новый застройщик: ${developerName}`);
    }
    return database.developers[developerName];
}

function addComplexToDeveloper(developerName, complexName) {
    const developer = database.developers[developerName];
    if (developer && !developer.complexes.includes(complexName)) {
        developer.complexes.push(complexName);
        saveData();
        showToast(`✅ Добавлен новый ЖК: ${complexName} (${developerName})`);
        return true;
    }
    return false;
}

// ========== СОХРАНЕНИЕ КОНТАКТА ==========
function saveContact() {
    const developer = document.getElementById('developerInput').value.trim();
    const complex = document.getElementById('complexInput').value.trim();
    const address = document.getElementById('addressInput').value.trim();
    const opAddress = document.getElementById('opAddressInput').value.trim();
    const commonPhone = formatPhone(document.getElementById('commonPhoneInput').value.trim());
    
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
    
    // Обновляем доп. информацию о застройщике
    if (address && database.developers[developer].address !== address) {
        database.developers[developer].address = address;
    }
    if (opAddress && database.developers[developer].opAddress !== opAddress) {
        database.developers[developer].opAddress = opAddress;
    }
    if (commonPhone && database.developers[developer].commonPhone !== commonPhone) {
        database.developers[developer].commonPhone = commonPhone;
    }
    
    // Сохраняем менеджеров
    const managerItems = document.querySelectorAll('.manager-item');
    let savedCount = 0;
    
    managerItems.forEach(item => {
        const name = item.querySelector('.manager-name').value.trim();
        const phone = formatPhone(item.querySelector('.manager-phone').value.trim());
        const role = item.querySelector('.manager-role').value;
        
        if (name && phone) {
            // Проверка на дубликат
            const exists = database.contacts.some(c => 
                c.developer === developer && 
                c.complex === complex && 
                c.name === name
            );
            
            if (!exists) {
                database.contacts.push({
                    developer,
                    complex,
                    name,
                    phone,
                    role
                });
                savedCount++;
            }
        }
    });
    
    saveData();
    showToast(`✅ Сохранено: ${savedCount} контакт(ов) для ${complex}`);
    resetForm();
    renderTable();
}

// ========== РЕДАКТИРОВАНИЕ КОНТАКТА ==========
function editContact(index) {
    const contact = database.contacts[index];
    if (!contact) return;
    
    editMode = true;
    editId = index;
    
    document.getElementById('formTitle').innerHTML = '<i class="fas fa-edit"></i> Редактирование контакта';
    document.getElementById('developerInput').value = contact.developer;
    document.getElementById('complexInput').value = contact.complex;
    
    const dev = database.developers[contact.developer];
    if (dev) {
        document.getElementById('addressInput').value = dev.address || '';
        document.getElementById('opAddressInput').value = dev.opAddress || '';
        document.getElementById('commonPhoneInput').value = dev.commonPhone || '';
    }
    
    // Очищаем и заполняем менеджеров
    const container = document.getElementById('managersContainer');
    container.innerHTML = '';
    
    const managerItem = createManagerItem();
    managerItem.querySelector('.manager-name').value = contact.name;
    managerItem.querySelector('.manager-phone').value = contact.phone;
    managerItem.querySelector('.manager-role').value = contact.role;
    container.appendChild(managerItem);
    
    document.getElementById('formPanel').classList.add('active');
    document.getElementById('showFormBtn').style.display = 'none';
}

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

// ========== УДАЛЕНИЕ КОНТАКТА ==========
function deleteContact(index) {
    if (confirm('Удалить этот контакт?')) {
        database.contacts.splice(index, 1);
        saveData();
        renderTable();
        showToast('🗑️ Контакт удален');
    }
}

// ========== ОТОБРАЖЕНИЕ ТАБЛИЦЫ ==========
function renderTable() {
    const tbody = document.getElementById('tableBody');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filterType = document.getElementById('filterType').value;
    
    let filteredContacts = [...database.contacts];
    
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
                <td colspan="5">${database.developers[dev]?.complexes.join(', ') || '-'}</td>
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
    
    // Отображаем контакты
    if (filteredContacts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Нет данных</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredContacts.map((contact, idx) => `
        <tr>
            <td>${escapeHtml(contact.developer)}</td>
            <td>${escapeHtml(contact.complex)}</td>
            <td>${escapeHtml(database.developers[contact.developer]?.address || '-')}</td>
            <td>${escapeHtml(database.developers[contact.developer]?.commonPhone || '-')}</td>
            <td>${escapeHtml(contact.name)}<br><small>${escapeHtml(contact.phone)}</small><br><span style="color:#a78bfa">${escapeHtml(contact.role)}</span></td>
            <td class="action-btns">
                <button class="btn btn-secondary" onclick="editContact(${database.contacts.indexOf(contact)})" style="padding: 6px 12px;">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger" onclick="deleteContact(${database.contacts.indexOf(contact)})" style="padding: 6px 12px;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========== ЭКСПОРТ CSV ==========
function exportToCSV() {
    let csv = "Застройщик,Название ЖК,Адрес ЖК,Адрес ОП,Общий телефон,Менеджер,Телефон менеджера,Должность\n";
    
    for (let contact of database.contacts) {
        const dev = database.developers[contact.developer];
        csv += `"${contact.developer}","${contact.complex}","${dev?.address || ''}","${dev?.opAddress || ''}","${dev?.commonPhone || ''}","${contact.name}","${contact.phone}","${contact.role}"\n`;
    }
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
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

// ========== СБРОС ФОРМЫ ==========
function resetForm() {
    editMode = false;
    editId = null;
    document.getElementById('formTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Добавление контакта';
    document.getElementById('developerInput').value = '';
    document.getElementById('complexInput').value = '';
    document.getElementById('addressInput').value = '';
    document.getElementById('opAddressInput').value = '';
    document.getElementById('commonPhoneInput').value = '';
    
    const container = document.getElementById('managersContainer');
    container.innerHTML = '';
    const firstManager = createManagerItem();
    container.appendChild(firstManager);
    
    document.getElementById('formPanel').classList.remove('active');
    document.getElementById('showFormBtn').style.display = 'inline-flex';
}

// ========== УВЕДОМЛЕНИЯ ==========
function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.background = isError ? 'rgba(239, 68, 68, 0.9)' : 'rgba(0, 0, 0, 0.9)';
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ========== НАСТРОЙКА СОБЫТИЙ ==========
function setupEventListeners() {
    document.getElementById('showFormBtn').addEventListener('click', () => {
        resetForm();
        document.getElementById('formPanel').classList.add('active');
        document.getElementById('showFormBtn').style.display = 'none';
    });
    
    document.getElementById('cancelFormBtn').addEventListener('click', resetForm);
    document.getElementById('saveContactBtn').addEventListener('click', saveContact);
    document.getElementById('addManagerBtn').addEventListener('click', () => {
        const container = document.getElementById('managersContainer');
        container.appendChild(createManagerItem());
    });
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
    document.getElementById('searchBtn').addEventListener('click', () => renderTable());
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') renderTable();
    });
    document.getElementById('filterType').addEventListener('change', () => renderTable());
}

// Делаем функции глобальными для onclick
window.editContact = editContact;
window.deleteContact = deleteContact;
