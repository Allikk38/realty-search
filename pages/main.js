/**
 * Модуль каталога застройщиков
 * Версия: 3.0
 * Описание: Отображение каталога ЖК с группировкой по застройщикам и категориям
 * 
 * Особенности:
 * - Автоматическая загрузка данных из data.csv с GitHub
 * - Кеширование в localStorage
 * - Фильтрация по категориям (Новостройки/Загородная)
 * - Поиск по застройщикам, ЖК и менеджерам
 */

// ========== СОСТОЯНИЕ МОДУЛЯ (ЗАКРЫТОЕ) ==========
const state = {
    database: {
        developers: {},
        contacts: []
    },
    currentCategory: 'all',
    searchQuery: '',
    lastUpdate: null
};

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

/**
 * Экранирование HTML специальных символов
 * @param {string} str - Входная строка
 * @returns {string} - Экранированная строка
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, (m) => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

/**
 * Форматирование номера телефона для отображения
 * @param {string} phone - Номер телефона
 * @returns {string} - Отформатированный номер
 */
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
    setTimeout(() => toast.remove(), 2500);
}

// ========== ЗАГРУЗКА ДАННЫХ ИЗ CSV ==========

/**
 * Парсинг CSV в структуру базы данных
 * @param {string} csvText - Содержимое CSV файла
 * @returns {Object} - Объект с developers и contacts
 */
function parseCSVToDatabase(csvText) {
    const lines = csvText.split('\n');
    if (lines.length === 0) return { developers: {}, contacts: [] };
    
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    
    const developers = {};
    const contacts = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Парсим CSV с учетом кавычек
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
        
        // Извлекаем значения по индексам
        const developer = row[0]?.replace(/^"|"$/g, '')?.trim();
        const complex = row[1]?.replace(/^"|"$/g, '')?.trim();
        const address = row[2]?.replace(/^"|"$/g, '')?.trim() || '';
        const opAddress = row[3]?.replace(/^"|"$/g, '')?.trim() || '';
        const commonPhone = row[4]?.replace(/^"|"$/g, '')?.trim() || '';
        const manager = row[5]?.replace(/^"|"$/g, '')?.trim();
        const managerPhone = row[6]?.replace(/^"|"$/g, '')?.trim();
        const role = row[7]?.replace(/^"|"$/g, '')?.trim() || 'менеджер';
        const category = row[8]?.replace(/^"|"$/g, '')?.trim() || 'newbuild';
        
        if (!developer || !complex) continue;
        
        // Очищаем названия от мусора
        const cleanDeveloper = developer
            .replace(/Сайт|ТГ-канал|Realt.one/g, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        const cleanComplex = complex
            .replace(/Сайт|ТГ-канал|Realt.one/g, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        
        // Добавляем застройщика
        if (!developers[cleanDeveloper]) {
            developers[cleanDeveloper] = {
                id: 'dev_' + Date.now() + '_' + Math.random(),
                complexes: [],
                address: address,
                opAddress: opAddress,
                commonPhone: commonPhone,
                category: category
            };
        }
        
        const devData = developers[cleanDeveloper];
        
        // Добавляем ЖК
        if (!devData.complexes.includes(cleanComplex)) {
            devData.complexes.push(cleanComplex);
        }
        
        // Обновляем адреса и телефоны
        if (address && !devData.address) devData.address = address;
        if (opAddress && !devData.opAddress) devData.opAddress = opAddress;
        if (commonPhone && !devData.commonPhone) devData.commonPhone = commonPhone;
        
        // Добавляем контакт (если это менеджер, а не общий телефон)
        if (manager && manager !== 'Общий телефон' && manager !== 'Телефон ОП' && managerPhone) {
            const exists = contacts.some(c => 
                c.developer === cleanDeveloper && 
                c.complex === cleanComplex && 
                c.name === manager
            );
            
            if (!exists) {
                contacts.push({
                    developer: cleanDeveloper,
                    complex: cleanComplex,
                    name: manager,
                    phone: managerPhone,
                    role: role
                });
            }
        }
    }
    
    return { developers, contacts };
}

/**
 * Загрузка данных из CSV файла с GitHub
 * @returns {Promise<boolean>} - Успех загрузки
 */
async function loadDataFromGitHub() {
    const csvUrl = 'https://raw.githubusercontent.com/allikk38/realty-search/main/data.csv';
    
    try {
        const response = await fetch(csvUrl + '?t=' + Date.now());
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const csvText = await response.text();
        const parsedData = parseCSVToDatabase(csvText);
        
        if (parsedData && Object.keys(parsedData.developers).length > 0) {
            // Сохраняем в localStorage
            localStorage.setItem('contactsDatabase', JSON.stringify(parsedData));
            localStorage.setItem('lastDataUpdate', new Date().toISOString());
            console.log('✅ Данные автоматически обновлены из GitHub');
            console.log(`   Застройщиков: ${Object.keys(parsedData.developers).length}`);
            console.log(`   Контактов: ${parsedData.contacts.length}`);
            return true;
        }
    } catch (err) {
        console.error('Ошибка загрузки данных с GitHub:', err);
        return false;
    }
}

/**
 * Загрузка данных из localStorage
 * @returns {boolean} - Успех загрузки
 */
function loadDataFromLocalStorage() {
    const saved = localStorage.getItem('contactsDatabase');
    if (!saved) return false;
    
    try {
        const fullData = JSON.parse(saved);
        state.database = {
            developers: fullData.developers || {},
            contacts: fullData.contacts || []
        };
        
        // Добавляем категории, если их нет
        for (const devName in state.database.developers) {
            if (!state.database.developers[devName].category) {
                const isSuburban = devName.toLowerCase().includes('кп') || 
                                  devName.toLowerCase().includes('поселок') ||
                                  devName.toLowerCase().includes('деревня') ||
                                  devName.toLowerCase().includes('загород');
                state.database.developers[devName].category = isSuburban ? 'suburban' : 'newbuild';
            }
        }
        
        state.lastUpdate = localStorage.getItem('lastDataUpdate');
        return true;
    } catch(e) {
        console.error('Ошибка загрузки из localStorage:', e);
        return false;
    }
}

/**
 * Инициализация демонстрационных данных (на случай, если нет данных)
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
            { developer: "Расцветай", complex: "Расцветай на Красном", name: "Денис Бородин", phone: "+7 960 792-82-68", role: "менеджер" }
        ]
    };
    localStorage.setItem('contactsDatabase', JSON.stringify(state.database));
    console.log('📦 Загружены демо-данные');
}

/**
 * Основная функция загрузки данных
 */
async function loadCatalogData() {
    // Сначала пробуем загрузить свежие данные с GitHub
    const updated = await loadDataFromGitHub();
    
    if (!updated) {
        // Если не удалось загрузить с GitHub, берем из localStorage
        if (!loadDataFromLocalStorage()) {
            initDemoData();
        }
    } else {
        // Данные уже загружены в loadDataFromGitHub и сохранены в localStorage
        loadDataFromLocalStorage();
    }
    
    console.log('📊 Итоговые данные:');
    console.log(`   Застройщиков: ${Object.keys(state.database.developers).length}`);
    console.log(`   Контактов: ${state.database.contacts.length}`);
    
    renderCatalog();
}

// ========== ОБРАБОТКА ПАРАМЕТРОВ URL ==========

/**
 * Обработка параметра категории из URL
 */
function handleUrlCategory() {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    
    if (category === 'newbuild') {
        state.currentCategory = 'newbuild';
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
        state.currentCategory = 'suburban';
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

// ========== ПОЛУЧЕНИЕ ОТФИЛЬТРОВАННЫХ ЗАСТРОЙЩИКОВ ==========

/**
 * Получение отфильтрованных застройщиков
 * @returns {Array} - Массив отфильтрованных застройщиков
 */
function getFilteredDevelopers() {
    let developers = Object.entries(state.database.developers).map(([name, data]) => ({
        name: name,
        ...data
    }));
    
    // Фильтр по категории
    if (state.currentCategory !== 'all') {
        developers = developers.filter(dev => dev.category === state.currentCategory);
    }
    
    // Поиск
    if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        developers = developers.filter(dev => {
            if (dev.name.toLowerCase().includes(query)) return true;
            
            const hasMatchingComplex = dev.complexes.some(complex => 
                String(complex).toLowerCase().includes(query)
            );
            if (hasMatchingComplex) return true;
            
            const hasMatchingContact = state.database.contacts.some(contact => 
                contact.developer === dev.name && 
                (contact.name.toLowerCase().includes(query) || 
                 contact.phone.includes(query))
            );
            if (hasMatchingContact) return true;
            
            return false;
        });
    }
    
    // Сортировка по алфавиту
    developers.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    
    return developers;
}

// ========== ОТОБРАЖЕНИЕ КАТАЛОГА ==========

/**
 * Рендер карточки застройщика
 * @param {Object} developer - Объект застройщика
 * @returns {string} HTML строка
 */
function renderDeveloperCard(developer) {
    const category = developer.category === 'suburban' ? 'suburban' : 'newbuild';
    const categoryIcon = category === 'suburban' ? 'fa-tree' : 'fa-city';
    const categoryText = category === 'suburban' ? 'Загородная' : 'Новостройка';
    
    const complexesWithContacts = developer.complexes.map(complex => ({
        name: complex,
        commonPhone: developer.commonPhone || '',
        address: developer.address || developer.opAddress || '',
        managers: state.database.contacts.filter(c => c.developer === developer.name && c.complex === complex)
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
                ${complexesWithContacts.map(complex => renderComplexCard(complex)).join('')}
            </div>
        </div>
    `;
}

/**
 * Рендер карточки ЖК
 * @param {Object} complex - Объект ЖК
 * @returns {string} HTML строка
 */
function renderComplexCard(complex) {
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

/**
 * Отрисовка каталога
 */
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
    attachCatalogEventHandlers();
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
        showToast(`✅ Скопировано: ${text}`);
    }).catch(() => {
        showToast('❌ Не удалось скопировать', true);
    });
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    state.searchQuery = '';
    renderCatalog();
}

function attachCatalogEventHandlers() {
    document.querySelectorAll('.developer-card').forEach(card => {
        card.classList.remove('collapsed');
    });
    document.querySelectorAll('.complex-item').forEach(item => {
        item.classList.add('collapsed');
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
            state.currentCategory = tab.dataset.category;
            renderCatalog();
        });
    });
    
    // Поиск
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            state.searchQuery = searchInput?.value.trim() || '';
            renderCatalog();
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                state.searchQuery = searchInput.value.trim();
                renderCatalog();
            }
        });
    }
    
    // Категория в поиске
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            const value = categoryFilter.value;
            if (value === 'all') state.currentCategory = 'all';
            else if (value === 'newbuild') state.currentCategory = 'newbuild';
            else if (value === 'suburban') state.currentCategory = 'suburban';
            
            const tabs = document.querySelectorAll('.tab');
            tabs.forEach(tab => {
                if (tab.dataset.category === state.currentCategory) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
            
            renderCatalog();
        });
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========

/**
 * Инициализация приложения
 */
async function init() {
    await loadCatalogData();
    setupCatalogEventListeners();
    handleUrlCategory();
}

// Делаем функции глобальными для onclick
window.toggleDeveloper = toggleDeveloper;
window.toggleComplex = toggleComplex;
window.copyToClipboard = copyToClipboard;
window.clearSearch = clearSearch;

// Запуск приложения
document.addEventListener('DOMContentLoaded', init);
