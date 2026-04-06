// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let database = {
    developers: {},
    contacts: []
};

let currentCategory = 'all';
let searchQuery = '';

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
});

// ========== ЗАГРУЗКА ДАННЫХ ==========
function loadData() {
    const saved = localStorage.getItem('contactsDatabase');
    if (saved) {
        try {
            database = JSON.parse(saved);
            // Добавляем категории для существующих застройщиков, если их нет
            ensureCategories();
        } catch(e) {
            console.error('Ошибка загрузки', e);
            initDemoData();
        }
    } else {
        initDemoData();
    }
    renderCatalog();
}

// Добавляем категории для застройщиков
function ensureCategories() {
    for (let devName in database.developers) {
        if (!database.developers[devName].category) {
            // Автоопределение категории
            const isSuburban = devName.toLowerCase().includes('кп') || 
                              devName.toLowerCase().includes('поселок') ||
                              devName.toLowerCase().includes('деревня') ||
                              devName.toLowerCase().includes('загород');
            database.developers[devName].category = isSuburban ? 'suburban' : 'newbuild';
        }
    }
    saveData();
}

// Демо-данные
function initDemoData() {
    database = {
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
            },
            "КПД-Газстрой": {
                id: "dev_4",
                complexes: ["Чистая Слобода", "Тайгинский парк", "Калина Красная"],
                address: "",
                commonPhone: "+7 (383) 363-24-80",
                opAddress: "Красный проспект, 39",
                category: "newbuild"
            },
            "КП «Сосновый Бор»": {
                id: "dev_5",
                complexes: ["Сосновый Бор 1", "Сосновый Бор 2"],
                address: "Новосибирский район, пос. Кудряшовский",
                commonPhone: "+7 (383) 123-45-67",
                opAddress: "",
                category: "suburban"
            },
            "Загородный Клуб «Береговой»": {
                id: "dev_6",
                complexes: ["Береговой квартал", "Резиденция Берег"],
                address: "Искитимский район, с. Береговое",
                commonPhone: "+7 (383) 987-65-43",
                opAddress: "",
                category: "suburban"
            }
        },
        contacts: [
            // Новостройки
            { developer: "Расцветай", complex: "Эко-квартал на Кедровой", name: "Данил Швец", phone: "+7 961 873-63-10", role: "менеджер" },
            { developer: "Расцветай", complex: "Эко-квартал на Кедровой", name: "Александра Гаммель", phone: "+7 961 848-39-56", role: "менеджер" },
            { developer: "Расцветай", complex: "Расцветай на Красном", name: "Денис Бородин", phone: "+7 960 792-82-68", role: "менеджер" },
            { developer: "VIRA (Вира)", complex: "CITATUM (Цитатум)", name: "Екатерина Рольгайзер", phone: "+7 913 723-00-37", role: "специалист по работе с партнерами" },
            { developer: "Брусника. Сибакадемстрой", complex: "Авиатор", name: "Максим Попов", phone: "+7 999 463 3627", role: "менеджер" },
            { developer: "Брусника. Сибакадемстрой", complex: "Авиатор", name: "Виктор Павлов", phone: "+7 913 627 5181", role: "менеджер" },
            { developer: "КПД-Газстрой", complex: "Чистая Слобода", name: "Светлана Дудина", phone: "+7 913 981-00-71", role: "менеджер" },
            { developer: "КПД-Газстрой", complex: "Чистая Слобода", name: "Белая Татьяна", phone: "+7 965 822-00-73", role: "менеджер" },
            // Загородка
            { developer: "КП «Сосновый Бор»", complex: "Сосновый Бор 1", name: "Ирина Соснова", phone: "+7 913 123-45-67", role: "менеджер" },
            { developer: "КП «Сосновый Бор»", complex: "Сосновый Бор 2", name: "Алексей Боровой", phone: "+7 913 234-56-78", role: "руководитель ОП" },
            { developer: "Загородный Клуб «Береговой»", complex: "Береговой квартал", name: "Мария Прибрежная", phone: "+7 913 345-67-89", role: "менеджер" }
        ]
    };
    saveData();
}

function saveData() {
    localStorage.setItem('contactsDatabase', JSON.stringify(database));
}

// ========== ФОРМАТИРОВАНИЕ ТЕЛЕФОНА ==========
function formatPhoneForDisplay(phone) {
    if (!phone) return '';
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('8') && cleaned.length === 11) {
        cleaned = '+7' + cleaned.slice(1);
    }
    if (cleaned.length === 12 && cleaned.startsWith('+7')) {
        return cleaned.replace(/(\+7)(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3-$4-$5');
    }
    return phone;
}

// ========== ОТОБРАЖЕНИЕ КАТАЛОГА ==========
function renderCatalog() {
    const catalog = document.getElementById('catalog');
    const filteredDevs = getFilteredDevelopers();
    
    if (filteredDevs.length === 0) {
        catalog.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>Ничего не найдено по вашему запросу</p>
                <button class="btn btn-outline" onclick="clearSearch()" style="margin-top: 20px;">
                    <i class="fas fa-undo"></i> Очистить поиск
                </button>
            </div>
        `;
        return;
    }
    
    catalog.innerHTML = filteredDevs.map(dev => renderDeveloperCard(dev)).join('');
    
    // Добавляем обработчики после рендера
    attachEventHandlers();
}

function getFilteredDevelopers() {
    let developers = Object.values(database.developers);
    
    // Фильтр по категории
    if (currentCategory !== 'all') {
        developers = developers.filter(dev => dev.category === currentCategory);
    }
    
    // Поиск
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        developers = developers.filter(dev => {
            // Поиск по названию застройщика
            if (dev.name?.toLowerCase().includes(query)) return true;
            if (dev.toLowerCase().includes(query)) return true;
            
            // Поиск по ЖК
            const hasMatchingComplex = dev.complexes.some(complex => 
                complex.toLowerCase().includes(query)
            );
            if (hasMatchingComplex) return true;
            
            // Поиск по контактам
            const hasMatchingContact = database.contacts.some(contact => 
                contact.developer === (dev.name || dev) && 
                (contact.name.toLowerCase().includes(query) || 
                 contact.phone.includes(query))
            );
            if (hasMatchingContact) return true;
            
            return false;
        });
    }
    
    // Сортировка по алфавиту
    return developers.sort((a, b) => {
        const nameA = (a.name || a).toLowerCase();
        const nameB = (b.name || b).toLowerCase();
        return nameA.localeCompare(nameB);
    });
}

function renderDeveloperCard(developer) {
    const devName = developer.name || developer;
    const devData = developer.name ? developer : database.developers[developer];
    const complexes = devData?.complexes || [];
    const category = devData?.category === 'suburban' ? 'suburban' : 'newbuild';
    const categoryIcon = category === 'suburban' ? 'fa-tree' : 'fa-city';
    const categoryText = category === 'suburban' ? 'Загородная' : 'Новостройка';
    
    // Получаем уникальные ЖК с их контактами
    const complexesWithContacts = complexes.map(complex => ({
        name: complex,
        commonPhone: devData?.commonPhone || '',
        address: devData?.address || devData?.opAddress || '',
        managers: database.contacts.filter(c => c.developer === devName && c.complex === complex)
    }));
    
    const totalContacts = complexesWithContacts.reduce((sum, c) => sum + c.managers.length, 0);
    
    return `
        <div class="developer-card" data-developer="${escapeHtml(devName)}" data-category="${category}">
            <div class="developer-header" onclick="toggleDeveloper(this)">
                <div class="developer-info">
                    <div class="developer-icon">
                        <i class="fas ${categoryIcon}"></i>
                    </div>
                    <div>
                        <div class="developer-name">${escapeHtml(devName)}</div>
                        <div class="developer-stats">
                            <span><i class="fas fa-home"></i> ${complexes.length} ЖК</span>
                            <span><i class="fas fa-phone"></i> ${totalContacts} контактов</span>
                            <span><i class="fas fa-tag"></i> ${categoryText}</span>
                        </div>
                    </div>
                </div>
                <i class="fas fa-chevron-down toggle-icon"></i>
            </div>
            <div class="complexes-list">
                ${complexesWithContacts.map(complex => renderComplexCard(complex, devName)).join('')}
            </div>
        </div>
    `;
}

function renderComplexCard(complex, developerName) {
    const hasManagers = complex.managers.length > 0;
    const hasCommonPhone = complex.commonPhone;
    
    return `
        <div class="complex-item" data-complex="${escapeHtml(complex.name)}">
            <div class="complex-header" onclick="toggleComplex(this)">
                <div class="complex-name">
                    <i class="fas fa-building"></i>
                    ${escapeHtml(complex.name)}
                </div>
                ${hasCommonPhone ? `
                    <div class="complex-phone">
                        <i class="fas fa-phone-alt"></i>
                        ${formatPhoneForDisplay(complex.commonPhone)}
                        <button class="copy-btn" onclick="event.stopPropagation(); copyToClipboard('${complex.commonPhone}')">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                ` : ''}
                <i class="fas fa-chevron-right toggle-icon" style="font-size: 0.8rem;"></i>
            </div>
            <div class="complex-details">
                ${complex.address ? `
                    <div class="complex-address">
                        <i class="fas fa-map-marker-alt"></i>
                        ${escapeHtml(complex.address)}
                    </div>
                ` : ''}
                ${hasManagers ? `
                    <div class="managers-title">
                        <i class="fas fa-users"></i> Менеджеры по продажам:
                    </div>
                    <div class="manager-list">
                        ${complex.managers.map(manager => `
                            <div class="manager-item">
                                <div class="manager-info">
                                    <span class="manager-name">${escapeHtml(manager.name)}</span>
                                    <span class="manager-role">${escapeHtml(manager.role)}</span>
                                </div>
                                <div>
                                    <a href="tel:${manager.phone.replace(/[^\d+]/g, '')}" class="manager-phone">
                                        <i class="fas fa-phone-alt"></i> ${formatPhoneForDisplay(manager.phone)}
                                    </a>
                                    <button class="copy-btn" onclick="copyToClipboard('${manager.phone}')">
                                        <i class="fas fa-copy"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div style="color: #64748b; font-size: 0.85rem; padding: 10px 0;">
                        <i class="fas fa-info-circle"></i> Нет добавленных контактов
                    </div>
                `}
            </div>
        </div>
    `;
}

// ========== ОБРАБОТЧИКИ ==========
function toggleDeveloper(element) {
    const card = element.closest('.developer-card');
    card.classList.toggle('collapsed');
}

function toggleComplex(element) {
    const item = element.closest('.complex-item');
    item.classList.toggle('collapsed');
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(`✅ Скопировано: ${text}`);
    }).catch(() => {
        showToast('❌ Не удалось скопировать', true);
    });
}

function showToast(message, isError = false) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.background = isError ? 'rgba(239, 68, 68, 0.9)' : 'rgba(0, 0, 0, 0.9)';
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    searchQuery = '';
    renderCatalog();
}

function attachEventHandlers() {
    // Сохраняем состояние свернутости всех карточек
    document.querySelectorAll('.developer-card').forEach(card => {
        // По умолчанию все развернуты
        card.classList.remove('collapsed');
    });
    
    document.querySelectorAll('.complex-item').forEach(item => {
        // По умолчанию все свернуты (чтобы не загромождать)
        item.classList.add('collapsed');
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
        return c;
    });
}

// ========== НАСТРОЙКА СОБЫТИЙ ==========
function setupEventListeners() {
    // Вкладки
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCategory = tab.dataset.category;
            renderCatalog();
        });
    });
    
    // Поиск
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    searchBtn.addEventListener('click', () => {
        searchQuery = searchInput.value.trim();
        renderCatalog();
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchQuery = searchInput.value.trim();
            renderCatalog();
        }
    });
    
    // Категория в поиске
    const categoryFilter = document.getElementById('categoryFilter');
    categoryFilter.addEventListener('change', () => {
        const value = categoryFilter.value;
        if (value === 'all') currentCategory = 'all';
        else if (value === 'newbuild') currentCategory = 'newbuild';
        else if (value === 'suburban') currentCategory = 'suburban';
        
        // Синхронизируем с вкладками
        document.querySelectorAll('.tab').forEach(tab => {
            if (tab.dataset.category === currentCategory) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        renderCatalog();
    });
}

// Делаем функции глобальными для onclick
window.toggleDeveloper = toggleDeveloper;
window.toggleComplex = toggleComplex;
window.copyToClipboard = copyToClipboard;
window.clearSearch = clearSearch;
