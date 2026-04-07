/**
 * Модуль каталога застройщиков
 * Версия: 4.1
 * Описание: Отображение каталога ЖК с группировкой по застройщикам и категориям
 * 
 * Особенности:
 * - Автоматическая загрузка данных из data.csv с GitHub
 * - Кеширование в localStorage
 * - Фильтрация по категориям (Новостройки/Загородная)
 * - Поиск по застройщикам, ЖК и менеджерам
 * - Исправлена проблема с пустыми застройщиками
 * - ВСЕ ГРУППЫ СВЁРНУТЫ ПО УМОЛЧАНИЮ
 */

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

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
 * Форматирование номера телефона для отображения
 * @param {string} phone - Номер телефона
 * @returns {string} - Отформатированный номер
 */
export function formatPhoneForDisplay(phone) {
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
export function showToast(message, isError = false) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.background = isError ? 'rgba(239, 68, 68, 0.9)' : 'rgba(0, 0, 0, 0.9)';
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
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

// ========== ПАРСИНГ CSV ==========

/**
 * Парсинг CSV в структуру базы данных
 * @param {string} csvText - Содержимое CSV файла
 * @returns {Object} - Объект с developers и contacts
 */
export function parseCSVToDatabase(csvText) {
    const lines = csvText.split('\n');
    if (lines.length === 0) return { developers: {}, contacts: [] };
    
    const developers = {};
    const contacts = [];
    
    // Счетчик для генерации имен застройщиков по умолчанию
    let unknownCounter = 0;
    
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
        let developer = row[0]?.replace(/^"|"$/g, '')?.trim();
        const complex = row[1]?.replace(/^"|"$/g, '')?.trim();
        const address = row[2]?.replace(/^"|"$/g, '')?.trim() || '';
        const opAddress = row[3]?.replace(/^"|"$/g, '')?.trim() || '';
        const commonPhone = row[4]?.replace(/^"|"$/g, '')?.trim() || '';
        const manager = row[5]?.replace(/^"|"$/g, '')?.trim();
        const managerPhone = row[6]?.replace(/^"|"$/g, '')?.trim();
        const role = row[7]?.replace(/^"|"$/g, '')?.trim() || 'менеджер';
        const category = row[8]?.replace(/^"|"$/g, '')?.trim() || 'newbuild';
        
        if (!complex) continue;
        
        // ========== КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ ==========
        // Если застройщик пустой, создаем имя на основе ЖК
        if (!developer || developer === '') {
            unknownCounter++;
            developer = `[ЖК без застройщика ${unknownCounter}]`;
        }
        
        // Очищаем названия
        const cleanDeveloper = cleanName(developer);
        const cleanComplex = cleanName(complex);
        
        // Добавляем застройщика
        if (!developers[cleanDeveloper]) {
            developers[cleanDeveloper] = {
                id: 'dev_' + Date.now() + '_' + Math.random(),
                complexes: [],
                address: address,
                opAddress: opAddress,
                commonPhone: commonPhone,
                category: category,
                // Сохраняем оригинальное имя для отображения
                originalName: developer
            };
        }
        
        const devData = developers[cleanDeveloper];
        
        // Добавляем ЖК
        if (!devData.complexes.includes(cleanComplex)) {
            devData.complexes.push(cleanComplex);
        }
        
        // Обновляем адреса и телефоны (берем непустые значения)
        if (address && !devData.address) devData.address = address;
        if (opAddress && !devData.opAddress) devData.opAddress = opAddress;
        if (commonPhone && !devData.commonPhone) devData.commonPhone = commonPhone;
        
        // Если у застройщика еще нет категории, устанавливаем
        if (!devData.category && category) devData.category = category;
        
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
    
    console.log(`📊 Парсинг завершен: ${Object.keys(developers).length} застройщиков, ${contacts.length} контактов`);
    
    return { developers, contacts };
}

// ========== РАБОТА С ХРАНИЛИЩЕМ ==========

/**
 * Сохранение данных в localStorage
 * @param {Object} database - База данных для сохранения
 */
export function saveToLocalStorage(database) {
    try {
        localStorage.setItem('contactsDatabase', JSON.stringify(database));
        localStorage.setItem('lastDataUpdate', new Date().toISOString());
        console.log('💾 Данные сохранены в localStorage');
        return true;
    } catch (e) {
        console.error('Ошибка сохранения в localStorage:', e);
        return false;
    }
}

/**
 * Загрузка данных из localStorage
 * @returns {Object|null} - Загруженная база данных или null
 */
export function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('contactsDatabase');
        if (!saved) return null;
        
        const data = JSON.parse(saved);
        console.log('📀 Данные загружены из localStorage');
        return data;
    } catch (e) {
        console.error('Ошибка загрузки из localStorage:', e);
        return null;
    }
}

/**
 * Загрузка данных из CSV файла с GitHub
 * @returns {Promise<Object|null>} - Объект с developers и contacts или null
 */
export async function loadDataFromGitHub() {
    const csvUrl = 'https://raw.githubusercontent.com/allikk38/realty-search/main/data.csv';
    
    try {
        console.log('🔄 Загрузка данных с GitHub...');
        const response = await fetch(csvUrl + '?t=' + Date.now());
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const csvText = await response.text();
        const parsedData = parseCSVToDatabase(csvText);
        
        if (parsedData && Object.keys(parsedData.developers).length > 0) {
            saveToLocalStorage(parsedData);
            console.log(`✅ Данные загружены из GitHub: ${Object.keys(parsedData.developers).length} застройщиков`);
            return parsedData;
        } else {
            console.warn('⚠️ GitHub вернул пустые данные');
            return null;
        }
    } catch (err) {
        console.error('❌ Ошибка загрузки данных с GitHub:', err);
        return null;
    }
}

/**
 * Инициализация демонстрационных данных (на случай, если нет данных)
 * @returns {Object} - Демо-база данных
 */
export function initDemoData() {
    const demoData = {
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
    
    saveToLocalStorage(demoData);
    console.log('📦 Инициализированы демо-данные');
    return demoData;
}

/**
 * Основная функция загрузки данных
 * @returns {Promise<Object>} - Загруженная база данных
 */
export async function loadCatalogData() {
    // Сначала пробуем загрузить свежие данные с GitHub
    let data = await loadDataFromGitHub();
    
    if (!data) {
        // Если не удалось загрузить с GitHub, берем из localStorage
        data = loadFromLocalStorage();
    }
    
    if (!data) {
        // Если нет данных в localStorage, создаем демо
        data = initDemoData();
    }
    
    // Добавляем категории, если их нет
    for (const devName in data.developers) {
        if (!data.developers[devName].category) {
            const isSuburban = devName.toLowerCase().includes('кп') || 
                              devName.toLowerCase().includes('поселок') ||
                              devName.toLowerCase().includes('деревня') ||
                              devName.toLowerCase().includes('загород');
            data.developers[devName].category = isSuburban ? 'suburban' : 'newbuild';
        }
    }
    
    console.log('📊 Итоговые данные:');
    console.log(`   Застройщиков: ${Object.keys(data.developers).length}`);
    console.log(`   Контактов: ${data.contacts.length}`);
    
    return data;
}

// ========== КОМПОНЕНТЫ ОТОБРАЖЕНИЯ ==========

/**
 * Рендер карточки застройщика
 * @param {Object} developer - Объект застройщика
 * @param {Array} contacts - Массив контактов
 * @returns {string} HTML строка
 */
export function renderDeveloperCard(developer, contacts) {
    const category = developer.category === 'suburban' ? 'suburban' : 'newbuild';
    const categoryIcon = category === 'suburban' ? 'fa-tree' : 'fa-city';
    const categoryText = category === 'suburban' ? 'Загородная' : 'Новостройка';
    
    const complexesWithContacts = developer.complexes.map(complex => ({
        name: complex,
        commonPhone: developer.commonPhone || '',
        address: developer.address || developer.opAddress || '',
        managers: contacts.filter(c => c.developer === developer.name && c.complex === complex)
    }));
    
    const totalContacts = complexesWithContacts.reduce((sum, c) => sum + c.managers.length, 0);
    
    // Если у застройщика есть адрес офиса продаж, показываем его
    const hasOfficeAddress = developer.opAddress && developer.opAddress !== '';
    
    // ИСПРАВЛЕНО: добавлен класс collapsed для сворачивания застройщика по умолчанию
    return `
        <div class="developer-card collapsed" data-developer="${escapeHtml(developer.name)}" data-category="${category}">
            <div class="developer-header" data-toggle="developer">
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
                            ${hasOfficeAddress ? `<span><i class="fas fa-map-pin"></i> ОП: ${escapeHtml(developer.opAddress)}</span>` : ''}
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
export function renderComplexCard(complex) {
    const hasManagers = complex.managers.length > 0;
    const hasCommonPhone = complex.commonPhone && complex.commonPhone !== '';
    
    // ИСПРАВЛЕНО: добавлен класс collapsed для сворачивания ЖК по умолчанию
    return `
        <div class="complex-item collapsed" data-complex="${escapeHtml(complex.name)}">
            <div class="complex-header" data-toggle="complex">
                <div class="complex-name">
                    <i class="fas fa-building"></i>
                    ${escapeHtml(complex.name)}
                </div>
                ${hasCommonPhone ? `
                    <div class="complex-phone">
                        <i class="fas fa-phone-alt"></i>
                        ${formatPhoneForDisplay(complex.commonPhone)}
                        <button class="copy-btn" data-copy="${complex.commonPhone.replace(/'/g, "\\'")}">
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
                                    <button class="copy-btn" data-copy="${manager.phone.replace(/'/g, "\\'")}">
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

// ========== ОСНОВНОЙ КЛАСС КАТАЛОГА ==========

class Catalog {
    constructor() {
        this.database = {
            developers: {},
            contacts: []
        };
        this.currentCategory = 'all';
        this.searchQuery = '';
        this.isInitialized = false;
    }

    /**
     * Получение отфильтрованных застройщиков
     * @returns {Array} - Массив отфильтрованных застройщиков
     */
    getFilteredDevelopers() {
        let developers = Object.entries(this.database.developers).map(([name, data]) => ({
            name: name,
            ...data
        }));
        
        // Фильтр по категории
        if (this.currentCategory !== 'all') {
            developers = developers.filter(dev => dev.category === this.currentCategory);
        }
        
        // Поиск
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            developers = developers.filter(dev => {
                if (dev.name.toLowerCase().includes(query)) return true;
                
                const hasMatchingComplex = dev.complexes.some(complex => 
                    String(complex).toLowerCase().includes(query)
                );
                if (hasMatchingComplex) return true;
                
                const hasMatchingContact = this.database.contacts.some(contact => 
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

    /**
     * Отрисовка каталога
     */
    render() {
        const catalog = document.getElementById('catalog');
        if (!catalog) return;
        
        const filteredDevs = this.getFilteredDevelopers();
        
        if (filteredDevs.length === 0) {
            catalog.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <p>Ничего не найдено по вашему запросу</p>
                    <button class="btn btn-outline" id="clearSearchBtn" style="margin-top: 20px;">
                        <i class="fas fa-undo"></i> Очистить поиск
                    </button>
                </div>
            `;
            
            const clearBtn = document.getElementById('clearSearchBtn');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => this.clearSearch());
            }
            return;
        }
        
        catalog.innerHTML = filteredDevs.map(dev => 
            renderDeveloperCard(dev, this.database.contacts)
        ).join('');
        
        this.attachEventHandlers();
    }

    /**
     * Прикрепление обработчиков событий к элементам каталога
     */
    attachEventHandlers() {
        // Обработчики для разворачивания/сворачивания застройщиков
        const developerHeaders = document.querySelectorAll('[data-toggle="developer"]');
        developerHeaders.forEach(header => {
            header.removeEventListener('click', this.handleDeveloperToggle);
            header.addEventListener('click', this.handleDeveloperToggle);
        });
        
        // Обработчики для разворачивания/сворачивания ЖК
        const complexHeaders = document.querySelectorAll('[data-toggle="complex"]');
        complexHeaders.forEach(header => {
            header.removeEventListener('click', this.handleComplexToggle);
            header.addEventListener('click', this.handleComplexToggle);
        });
        
        // Обработчики для кнопок копирования
        const copyBtns = document.querySelectorAll('[data-copy]');
        copyBtns.forEach(btn => {
            btn.removeEventListener('click', this.handleCopy);
            btn.addEventListener('click', this.handleCopy);
        });
    }

    handleDeveloperToggle(event) {
        const card = event.currentTarget.closest('.developer-card');
        if (card) card.classList.toggle('collapsed');
    }

    handleComplexToggle(event) {
        const item = event.currentTarget.closest('.complex-item');
        if (item) item.classList.toggle('collapsed');
    }

    handleCopy(event) {
        event.stopPropagation();
        const text = event.currentTarget.getAttribute('data-copy');
        if (text) {
            navigator.clipboard.writeText(text).then(() => {
                showToast(`✅ Скопировано: ${text}`);
            }).catch(() => {
                showToast('❌ Не удалось скопировать', true);
            });
        }
    }

    /**
     * Очистка поиска
     */
    clearSearch() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        this.searchQuery = '';
        this.render();
    }

    /**
     * Настройка обработчиков событий интерфейса
     */
    setupEventListeners() {
        // Вкладки
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentCategory = tab.dataset.category;
                this.render();
            });
        });
        
        // Поиск
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.searchQuery = searchInput?.value.trim() || '';
                this.render();
            });
        }
        
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchQuery = searchInput.value.trim();
                    this.render();
                }
            });
        }
        
        // Категория в поиске
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                const value = categoryFilter.value;
                this.currentCategory = value;
                
                const tabs = document.querySelectorAll('.tab');
                tabs.forEach(tab => {
                    if (tab.dataset.category === this.currentCategory) {
                        tab.classList.add('active');
                    } else {
                        tab.classList.remove('active');
                    }
                });
                
                this.render();
            });
        }
    }

    /**
     * Обработка параметра категории из URL
     */
    handleUrlCategory() {
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('category');
        
        if (category === 'newbuild') {
            this.currentCategory = 'newbuild';
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
            this.currentCategory = 'suburban';
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

    /**
     * Инициализация каталога
     */
    async init() {
        if (this.isInitialized) return;
        
        // Показываем скелетон загрузки
        const catalog = document.getElementById('catalog');
        if (catalog) {
            catalog.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Загрузка данных...</p>
                </div>
            `;
        }
        
        // Загружаем данные
        this.database = await loadCatalogData();
        
        // Настраиваем интерфейс
        this.setupEventListeners();
        this.handleUrlCategory();
        this.render();
        
        this.isInitialized = true;
        console.log('✅ Каталог инициализирован');
    }
}

// ========== ЗАПУСК ПРИЛОЖЕНИЯ ==========

// Создаем и экспортируем экземпляр каталога
const catalog = new Catalog();

// Запускаем инициализацию после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => catalog.init());
} else {
    catalog.init();
}

// Экспортируем экземпляр для возможного использования в других модулях
export default catalog;
