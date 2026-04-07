/**
 * Модуль каталога застройщиков
 * Версия: 2.1
 * Описание: Отображение каталога ЖК с группировкой по застройщикам и категориям
 */

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let catalogDatabase = {
    developers: {},
    contacts: []
};

let currentCategory = 'all';
let searchQuery = '';

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    loadCatalogData();
    setupCatalogEventListeners();
    
    // Обработка параметра категории из URL
    handleUrlCategory();
});

// ========== ЗАГРУЗКА ДАННЫХ ==========
function loadCatalogData() {
    const saved = localStorage.getItem('contactsDatabase');
    console.log('Загрузка данных из localStorage:', saved ? 'есть данные' : 'нет данных');
    
    if (saved) {
        try {
            const fullData = JSON.parse(saved);
            console.log('Распарсенные данные:', fullData);
            console.log('Застройщиков:', Object.keys(fullData.developers || {}).length);
            console.log('Контактов:', (fullData.contacts || []).length);
            
            catalogDatabase = {
                developers: fullData.developers || {},
                contacts: fullData.contacts || []
            };
            
            // Дополнительно: проверяем и добавляем категории где их нет
            for (let devName in catalogDatabase.developers) {
                if (!catalogDatabase.developers[devName].category) {
                    // Автоопределение категории по названию
                    const isSuburban = devName.toLowerCase().includes('кп') || 
                                      devName.toLowerCase().includes('поселок') ||
                                      devName.toLowerCase().includes('деревня') ||
                                      devName.toLowerCase().includes('загород');
                    catalogDatabase.developers[devName].category = isSuburban ? 'suburban' : 'newbuild';
                }
            }
            
        } catch(e) {
            console.error('Ошибка загрузки', e);
            initCatalogDemoData();
        }
    } else {
        console.log('Нет данных в localStorage, загружаем демо-данные');
        initCatalogDemoData();
    }
    
    // Выводим итоговую статистику
    console.log('Итоговые данные для отображения:');
    console.log('- Застройщиков:', Object.keys(catalogDatabase.developers).length);
    console.log('- Контактов:', catalogDatabase.contacts.length);
    
    renderCatalog();
}

/**
 * Инициализация демонстрационных данных для каталога
 */
function initCatalogDemoData() {
    catalogDatabase = {
        developers: {
            "Расцветай": {
                id: "dev_1",
                complexes: ["Эко-квартал на Кедровой", "Расцветай на Красном", "Сакура Парк", "Расцветай на Зорге", "Цветной Бульвар", "Квартал на Игарской", "Тайм Парк", "Лофт.Наука"],
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
            "ГК Союз": {
                id: "dev_4",
                complexes: ["Самоцветы"],
                address: "",
                commonPhone: "383-20-23",
                opAddress: "",
                category: "newbuild"
            },
            "ГК Поляков": {
                id: "dev_5",
                complexes: ["Актив"],
                address: "г. Новосибирск, ул. Дуси Ковальчук, 246/1 (Актив)",
                commonPhone: "+7 (383) 390",
                opAddress: "",
                category: "newbuild"
            },
            "КПД-Газстрой": {
                id: "dev_6",
                complexes: ["Чистая Слобода", "Тайгинский парк", "Калина Красная"],
                address: "",
                commonPhone: "+7 (383) 363-24-80",
                opAddress: "Красный проспект, 39",
                category: "newbuild"
            },
            "КП «Сосновый Бор»": {
                id: "dev_7",
                complexes: ["Сосновый Бор 1", "Сосновый Бор 2"],
                address: "Новосибирский район, пос. Кудряшовский",
                commonPhone: "+7 (383) 123-45-67",
                opAddress: "",
                category: "suburban"
            },
            "Загородный Клуб «Береговой»": {
                id: "dev_8",
                complexes: ["Береговой квартал", "Резиденция Берег"],
                address: "Искитимский район, с. Береговое",
                commonPhone: "+7 (383) 987-65-43",
                opAddress: "",
                category: "suburban"
            }
        },
        contacts: [
            // Расцветай
            { developer: "Расцветай", complex: "Эко-квартал на Кедровой", name: "Данил Швец", phone: "+7 961 873-63-10", role: "менеджер" },
            { developer: "Расцветай", complex: "Эко-квартал на Кедровой", name: "Александра Гаммель", phone: "+7 961 848-39-56", role: "менеджер" },
            { developer: "Расцветай", complex: "Расцветай на Красном", name: "Денис Бородин", phone: "+7 960 792-82-68", role: "менеджер" },
            { developer: "Расцветай", complex: "Расцветай на Красном", name: "Алевтина Некрасова", phone: "+7 960 792-89-17", role: "менеджер" },
            { developer: "Расцветай", complex: "Расцветай на Красном", name: "Римма Усманова", phone: "+7 962 838-39-92", role: "менеджер" },
            { developer: "Расцветай", complex: "Расцветай на Красном", name: "Ирина Бойцова", phone: "+7 962 838 39 94", role: "менеджер" },
            { developer: "Расцветай", complex: "Сакура Парк", name: "Андрей Булавин", phone: "+7 960 792-82-46", role: "менеджер" },
            { developer: "Расцветай", complex: "Сакура Парк", name: "Олеся Леонтьева", phone: "+7 960 792-88-43", role: "менеджер" },
            { developer: "Расцветай", complex: "Сакура Парк", name: "Мария Калифкина", phone: "+7 960 792-83-97", role: "менеджер" },
            { developer: "Расцветай", complex: "Расцветай на Зорге", name: "Татьяна Мартынова", phone: "+7 961 226-59-43", role: "менеджер" },
            
            // VIRA
            { developer: "VIRA (Вира)", complex: "CITATUM (Цитатум)", name: "Екатерина Рольгайзер", phone: "+7 913 723-00-37", role: "специалист по работе с партнерами" },
            { developer: "VIRA (Вира)", complex: "CITATUM (Цитатум)", name: "Татьяна Меренцова", phone: "+7 999 320 26 00", role: "специалист по работе с партнерами" },
            { developer: "VIRA (Вира)", complex: "CITATUM (Цитатум)", name: "Максим Попов", phone: "+7 (923) 242-37-72", role: "специалист по работе с партнерами" },
            
            // Брусника
            { developer: "Брусника. Сибакадемстрой", complex: "Европейский Берег", name: "Анатолий Шелудько", phone: "+7 999 467 9278", role: "менеджер" },
            { developer: "Брусника. Сибакадемстрой", complex: "Европейский Берег", name: "Роман Семенец", phone: "+7 913 461 7222", role: "менеджер" },
            { developer: "Брусника. Сибакадемстрой", complex: "Европейский Берег", name: "Даниил Белов", phone: "+7 913 200 1855", role: "менеджер" },
            { developer: "Брусника. Сибакадемстрой", complex: "Авиатор", name: "Максим Попов", phone: "+7 999 463 3627", role: "менеджер" },
            { developer: "Брусника. Сибакадемстрой", complex: "Авиатор", name: "Виктор Павлов", phone: "+7 913 627 5181", role: "менеджер" },
            
            // ГК Союз
            { developer: "ГК Союз", complex: "Самоцветы", name: "Алёна Филиппова", phone: "+7 923 107-15-56", role: "менеджер" },
            { developer: "ГК Союз", complex: "Самоцветы", name: "Арина Шайбекова", phone: "+7 923 220-11-47", role: "менеджер" },
            
            // ГК Поляков
            { developer: "ГК Поляков", complex: "Актив", name: "Николай Драницын", phone: "8-913-786-0647", role: "менеджер" },
            { developer: "ГК Поляков", complex: "Актив", name: "Максим Леонов", phone: "+7 923 237 88 98", role: "менеджер" },
            
            // КПД-Газстрой
            { developer: "КПД-Газстрой", complex: "Чистая Слобода", name: "Светлана Дудина", phone: "+7 913 981-00-71", role: "менеджер" },
            { developer: "КПД-Газстрой", complex: "Чистая Слобода", name: "Белая Татьяна", phone: "+7 965 822-00-73", role: "менеджер" },
            
            // Загородка
            { developer: "КП «Сосновый Бор»", complex: "Сосновый Бор 1", name: "Ирина Соснова", phone: "+7 913 123-45-67", role: "менеджер" },
            { developer: "КП «Сосновый Бор»", complex: "Сосновый Бор 2", name: "Алексей Боровой", phone: "+7 913 234-56-78", role: "руководитель ОП" },
            { developer: "Загородный Клуб «Береговой»", complex: "Береговой квартал", name: "Мария Прибрежная", phone: "+7 913 345-67-89", role: "менеджер" }
        ]
    };
}

// ========== ОБРАБОТКА ПАРАМЕТРОВ URL ==========
function handleUrlCategory() {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    
    if (category === 'newbuild') {
        currentCategory = 'newbuild';
        const newbuildTab = document.querySelector('.tab[data-category="newbuild"]');
        if (newbuildTab) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            newbuildTab.classList.add('active');
        }
        const headerTitle = document.querySelector('.header h1');
        if (headerTitle) {
            headerTitle.innerHTML = '<i class="fas fa-city"></i> Новостройки Новосибирска';
        }
    } else if (category === 'suburban') {
        currentCategory = 'suburban';
        const suburbanTab = document.querySelector('.tab[data-category="suburban"]');
        if (suburbanTab) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            suburbanTab.classList.add('active');
        }
        const headerTitle = document.querySelector('.header h1');
        if (headerTitle) {
            headerTitle.innerHTML = '<i class="fas fa-tree"></i> Загородная недвижимость';
        }
    }
}

// ========== ФОРМАТИРОВАНИЕ ТЕЛЕФОНА ==========
function formatPhoneForDisplay(phone) {
    if (!phone) return '';
    let cleaned = String(phone).replace(/[^\d+]/g, '');
    if (cleaned.startsWith('8') && cleaned.length === 11) {
        cleaned = '+7' + cleaned.slice(1);
    }
    if (cleaned.length === 12 && cleaned.startsWith('+7')) {
        return cleaned.replace(/(\+7)(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3-$4-$5');
    }
    return phone;
}

// ========== ПОЛУЧЕНИЕ ОТФИЛЬТРОВАННЫХ ЗАСТРОЙЩИКОВ ==========
function getFilteredDevelopers() {
    // Преобразуем объект в массив для удобной фильтрации
    let developers = Object.entries(catalogDatabase.developers).map(([name, data]) => ({
        name: name,
        ...data
    }));
    
    console.log('Всего застройщиков до фильтрации:', developers.length);
    
    // Фильтр по категории
    if (currentCategory !== 'all') {
        developers = developers.filter(dev => dev.category === currentCategory);
        console.log(`После фильтра по категории "${currentCategory}":`, developers.length);
    }
    
    // Поиск
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        developers = developers.filter(dev => {
            // Поиск по названию застройщика
            if (dev.name.toLowerCase().includes(query)) return true;
            
            // Поиск по ЖК
            const hasMatchingComplex = dev.complexes.some(complex => 
                String(complex).toLowerCase().includes(query)
            );
            if (hasMatchingComplex) return true;
            
            // Поиск по контактам
            const hasMatchingContact = catalogDatabase.contacts.some(contact => 
                contact.developer === dev.name && 
                (contact.name.toLowerCase().includes(query) || 
                 contact.phone.includes(query))
            );
            if (hasMatchingContact) return true;
            
            return false;
        });
        console.log(`После поиска "${searchQuery}":`, developers.length);
    }
    
    // Сортировка по алфавиту
    developers.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    
    return developers;
}

// ========== ОТОБРАЖЕНИЕ КАТАЛОГА ==========
function renderCatalog() {
    const catalog = document.getElementById('catalog');
    if (!catalog) return;
    
    const filteredDevs = getFilteredDevelopers();
    
    if (filteredDevs.length === 0) {
        catalog.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>Ничего не найдено по вашему запросу</p>
                <button class="btn btn-outline" onclick="window.clearSearch()" style="margin-top: 20px;">
                    <i class="fas fa-undo"></i> Очистить поиск
                </button>
            </div>
        `;
        return;
    }
    
    catalog.innerHTML = filteredDevs.map(dev => renderDeveloperCard(dev)).join('');
    
    // Добавляем обработчики после рендера
    attachCatalogEventHandlers();
}

/**
 * Рендер карточки застройщика
 * @param {Object} developer - Объект застройщика
 * @returns {string} HTML строка
 */
function renderDeveloperCard(developer) {
    const category = developer.category === 'suburban' ? 'suburban' : 'newbuild';
    const categoryIcon = category === 'suburban' ? 'fa-tree' : 'fa-city';
    const categoryText = category === 'suburban' ? 'Загородная' : 'Новостройка';
    
    // Получаем уникальные ЖК с их контактами
    const complexesWithContacts = developer.complexes.map(complex => ({
        name: complex,
        commonPhone: developer.commonPhone || '',
        address: developer.address || developer.opAddress || '',
        managers: catalogDatabase.contacts.filter(c => c.developer === developer.name && c.complex === complex)
    }));
    
    const totalContacts = complexesWithContacts.reduce((sum, c) => sum + c.managers.length, 0);
    
    return `
        <div class="developer-card" data-developer="${escapeHtml(developer.name)}" data-category="${category}">
            <div class="developer-header" onclick="window.toggleDeveloper(this)">
                <div class="developer-info">
                    <div class="developer-icon">
                        <i class="fas ${categoryIcon}"></i>
                    </div>
                    <div>
                        <div class="developer-name">${escapeHtml(developer.name)}</div>
                        <div class="developer-stats">
                            <span><i class="fas fa-home"></i> ${developer.complexes.length} ЖК</span>
                            <span><i class="fas fa-phone"></i> ${totalContacts} контактов</span>
                            <span><i class="fas fa-tag"></i> ${categoryText}</span>
                        </div>
                    </div>
                </div>
                <i class="fas fa-chevron-down toggle-icon"></i>
            </div>
            <div class="complexes-list">
                ${complexesWithContacts.map(complex => renderComplexCard(complex, developer.name)).join('')}
            </div>
        </div>
    `;
}

/**
 * Рендер карточки ЖК
 * @param {Object} complex - Объект ЖК
 * @param {string} developerName - Название застройщика
 * @returns {string} HTML строка
 */
function renderComplexCard(complex, developerName) {
    const hasManagers = complex.managers.length > 0;
    const hasCommonPhone = complex.commonPhone;
    
    return `
        <div class="complex-item" data-complex="${escapeHtml(complex.name)}">
            <div class="complex-header" onclick="window.toggleComplex(this)">
                <div class="complex-name">
                    <i class="fas fa-building"></i>
                    ${escapeHtml(complex.name)}
                </div>
                ${hasCommonPhone ? `
                    <div class="complex-phone">
                        <i class="fas fa-phone-alt"></i>
                        ${formatPhoneForDisplay(complex.commonPhone)}
                        <button class="copy-btn" onclick="event.stopPropagation(); window.copyToClipboard('${complex.commonPhone.replace(/'/g, "\\'")}')">
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
                                    <button class="copy-btn" onclick="window.copyToClipboard('${manager.phone.replace(/'/g, "\\'")}')">
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

// ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========
function toggleDeveloper(element) {
    const card = element.closest('.developer-card');
    if (card) card.classList.toggle('collapsed');
}

function toggleComplex(element) {
    const item = element.closest('.complex-item');
    if (item) item.classList.toggle('collapsed');
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showCatalogToast(`✅ Скопировано: ${text}`);
    }).catch(() => {
        showCatalogToast('❌ Не удалось скопировать', true);
    });
}

function showCatalogToast(message, isError = false) {
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
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    searchQuery = '';
    renderCatalog();
}

function attachCatalogEventHandlers() {
    // По умолчанию все карточки застройщиков развернуты, ЖК свернуты
    document.querySelectorAll('.developer-card').forEach(card => {
        card.classList.remove('collapsed');
    });
    
    document.querySelectorAll('.complex-item').forEach(item => {
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
    });
}

// ========== НАСТРОЙКА СОБЫТИЙ ==========
function setupCatalogEventListeners() {
    // Вкладки
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCategory = tab.dataset.category;
            renderCatalog();
        });
    });
    
    // Поиск
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            searchQuery = searchInput?.value.trim() || '';
            renderCatalog();
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchQuery = searchInput.value.trim();
                renderCatalog();
            }
        });
    }
    
    // Категория в поиске
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            const value = categoryFilter.value;
            if (value === 'all') currentCategory = 'all';
            else if (value === 'newbuild') currentCategory = 'newbuild';
            else if (value === 'suburban') currentCategory = 'suburban';
            
            // Синхронизируем с вкладками
            const tabs = document.querySelectorAll('.tab');
            tabs.forEach(tab => {
                if (tab.dataset.category === currentCategory) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
            
            renderCatalog();
        });
    }
}

// Делаем функции глобальными для onclick
window.toggleDeveloper = toggleDeveloper;
window.toggleComplex = toggleComplex;
window.copyToClipboard = copyToClipboard;
window.clearSearch = clearSearch;
