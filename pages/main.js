/**
 * Модуль каталога застройщиков
 * Версия: 5.1
 * 
 * НОВЫЕ ФУНКЦИИ:
 * 1. Пагинация (по 20 застройщиков на страницу)
 * 2. Кнопки "Развернуть всё / Свернуть всё"
 * 3. Алфавитный указатель (А-Я)
 * 4. Сохранение состояния в localStorage
 * 5. Кнопка "Наверх"
 * 6. Светлая/тёмная тема с сохранением
 * 
 * Особенности:
 * - Автоматическая загрузка данных из data.csv с GitHub
 * - Кеширование в localStorage
 * - Фильтрация по категориям (Новостройки/Загородная)
 * - Поиск по застройщикам, ЖК и менеджерам
 * - ВСЕ ГРУППЫ СВЁРНУТЫ ПО УМОЛЧАНИЮ
 */

// ========== УПРАВЛЕНИЕ ТЕМОЙ ==========

const THEME_STORAGE_KEY = 'catalogTheme';

function getSavedTheme() {
    try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') return saved;
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
        return 'dark';
    } catch (e) {
        return 'dark';
    }
}

function applyTheme(theme) {
    const body = document.body;
    const themeToggleIcon = document.querySelector('#themeToggle i');
    
    if (theme === 'light') {
        body.classList.add('light-theme');
        if (themeToggleIcon) themeToggleIcon.className = 'fas fa-sun';
    } else {
        body.classList.remove('light-theme');
        if (themeToggleIcon) themeToggleIcon.className = 'fas fa-moon';
    }
}

function saveTheme(theme) {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {
        console.warn('Не удалось сохранить тему:', e);
    }
}

function initTheme() {
    const savedTheme = getSavedTheme();
    applyTheme(savedTheme);
    console.log(`🎨 Тема инициализирована: ${savedTheme === 'light' ? 'Светлая' : 'Тёмная'}`);
}

function toggleTheme() {
    const isLight = document.body.classList.contains('light-theme');
    const newTheme = isLight ? 'dark' : 'light';
    applyTheme(newTheme);
    saveTheme(newTheme);
    console.log(`🎨 Тема переключена: ${newTheme === 'light' ? 'Светлая' : 'Тёмная'}`);
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

/**
 * Экранирование HTML специальных символов
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
 */
export function parseCSVToDatabase(csvText) {
    const lines = csvText.split('\n');
    if (lines.length === 0) return { developers: {}, contacts: [] };
    
    const developers = {};
    const contacts = [];
    let unknownCounter = 0;
    
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
        
        if (!developer || developer === '') {
            unknownCounter++;
            developer = `[ЖК без застройщика ${unknownCounter}]`;
        }
        
        const cleanDeveloper = cleanName(developer);
        const cleanComplex = cleanName(complex);
        
        if (!developers[cleanDeveloper]) {
            developers[cleanDeveloper] = {
                id: 'dev_' + Date.now() + '_' + Math.random(),
                complexes: [],
                address: address,
                opAddress: opAddress,
                commonPhone: commonPhone,
                category: category,
                originalName: developer
            };
        }
        
        const devData = developers[cleanDeveloper];
        
        if (!devData.complexes.includes(cleanComplex)) {
            devData.complexes.push(cleanComplex);
        }
        
        if (address && !devData.address) devData.address = address;
        if (opAddress && !devData.opAddress) devData.opAddress = opAddress;
        if (commonPhone && !devData.commonPhone) devData.commonPhone = commonPhone;
        if (!devData.category && category) devData.category = category;
        
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

export async function loadCatalogData() {
    let data = await loadDataFromGitHub();
    if (!data) data = loadFromLocalStorage();
    if (!data) data = initDemoData();
    
    for (const devName in data.developers) {
        if (!data.developers[devName].category) {
            const isSuburban = devName.toLowerCase().includes('кп') || 
                              devName.toLowerCase().includes('поселок') ||
                              devName.toLowerCase().includes('деревня') ||
                              devName.toLowerCase().includes('загород');
            data.developers[devName].category = isSuburban ? 'suburban' : 'newbuild';
        }
    }
    
    console.log(`📊 Застройщиков: ${Object.keys(data.developers).length}, Контактов: ${data.contacts.length}`);
    return data;
}

// ========== КОМПОНЕНТЫ ОТОБРАЖЕНИЯ ==========

export function renderDeveloperCard(developer, contacts, isCollapsed = true) {
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
    const hasOfficeAddress = developer.opAddress && developer.opAddress !== '';
    const collapsedClass = isCollapsed ? 'collapsed' : '';
    
    return `
        <div class="developer-card ${collapsedClass}" data-developer="${escapeHtml(developer.name)}" data-category="${category}">
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

export function renderComplexCard(complex) {
    const hasManagers = complex.managers.length > 0;
    const hasCommonPhone = complex.commonPhone && complex.commonPhone !== '';
    
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
                    <div style="color: var(--text-muted); font-size: 0.85rem; padding: 10px 0;">
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
        this.database = { developers: {}, contacts: [] };
        this.currentCategory = 'all';
        this.searchQuery = '';
        this.isInitialized = false;
        
        // НОВОЕ: для пагинации
        this.currentPage = 1;
        this.perPage = 20;
        this.filteredDevelopers = [];
        
        // НОВОЕ: состояние свёрнутых групп
        this.collapseState = {};
    }

    /**
     * Загрузка сохранённого состояния из localStorage
     */
    loadCollapseState() {
        try {
            const saved = localStorage.getItem('catalogCollapseState');
            if (saved) {
                this.collapseState = JSON.parse(saved);
                console.log('📦 Загружено состояние свёрнутых групп');
            }
        } catch (e) {
            console.warn('Не удалось загрузить состояние:', e);
        }
    }

    /**
     * Сохранение состояния в localStorage
     */
    saveCollapseState() {
        try {
            localStorage.setItem('catalogCollapseState', JSON.stringify(this.collapseState));
        } catch (e) {
            console.warn('Не удалось сохранить состояние:', e);
        }
    }

    /**
     * Получение отфильтрованных застройщиков
     */
    getFilteredDevelopers() {
        let developers = Object.entries(this.database.developers).map(([name, data]) => ({
            name: name,
            ...data
        }));
        
        if (this.currentCategory !== 'all') {
            developers = developers.filter(dev => dev.category === this.currentCategory);
        }
        
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
                    (contact.name.toLowerCase().includes(query) || contact.phone.includes(query))
                );
                return hasMatchingContact;
            });
        }
        
        developers.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
        this.filteredDevelopers = developers;
        return developers;
    }

    /**
     * Получение застройщиков для текущей страницы
     */
    getPaginatedDevelopers() {
        const start = (this.currentPage - 1) * this.perPage;
        return this.filteredDevelopers.slice(start, start + this.perPage);
    }

    /**
     * Получение общего количества страниц
     */
    getTotalPages() {
        return Math.ceil(this.filteredDevelopers.length / this.perPage);
    }

    /**
     * НОВОЕ: Рендер пагинации
     */
    renderPagination() {
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer) return;
        
        const totalPages = this.getTotalPages();
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let pagesHtml = '';
        const maxVisible = 7;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        
        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            pagesHtml += `<button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        
        paginationContainer.innerHTML = `
            <button class="pagination-btn" id="firstPageBtn" ${this.currentPage === 1 ? 'disabled' : ''}>«</button>
            <button class="pagination-btn" id="prevPageBtn" ${this.currentPage === 1 ? 'disabled' : ''}>‹</button>
            <div class="page-numbers">${pagesHtml}</div>
            <button class="pagination-btn" id="nextPageBtn" ${this.currentPage === totalPages ? 'disabled' : ''}>›</button>
            <button class="pagination-btn" id="lastPageBtn" ${this.currentPage === totalPages ? 'disabled' : ''}>»</button>
        `;
        
        document.getElementById('firstPageBtn')?.addEventListener('click', () => this.goToPage(1));
        document.getElementById('prevPageBtn')?.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        document.getElementById('nextPageBtn')?.addEventListener('click', () => this.goToPage(this.currentPage + 1));
        document.getElementById('lastPageBtn')?.addEventListener('click', () => this.goToPage(totalPages));
        
        document.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', () => this.goToPage(parseInt(btn.dataset.page)));
        });
    }

    goToPage(page) {
        const totalPages = this.getTotalPages();
        if (page < 1 || page > totalPages) return;
        this.currentPage = page;
        this.render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * НОВОЕ: Обновление счётчика результатов
     */
    updateResultsCounter() {
        const counter = document.getElementById('resultsCounter');
        if (counter) {
            const total = this.filteredDevelopers.length;
            const start = (this.currentPage - 1) * this.perPage + 1;
            const end = Math.min(start + this.perPage - 1, total);
            counter.innerHTML = `<i class="fas fa-chart-simple"></i> Показано ${start}-${end} из ${total} застройщиков`;
        }
    }

    /**
     * НОВОЕ: Рендер алфавитного указателя
     */
    renderAlphabetNav() {
        const alphabet = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split('');
        const container = document.getElementById('alphabetNav');
        if (!container) return;
        
        const developers = this.filteredDevelopers;
        
        container.innerHTML = alphabet.map(letter => {
            const hasDeveloper = developers.some(dev => 
                dev.name.charAt(0).toUpperCase() === letter || 
                (letter === 'А' && 'AEIOU'.includes(dev.name.charAt(0)))
            );
            return `<button class="alphabet-btn" data-letter="${letter}" ${!hasDeveloper ? 'disabled style="opacity:0.3"' : ''}>${letter}</button>`;
        }).join('');
        
        container.querySelectorAll('.alphabet-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', () => this.scrollToLetter(btn.dataset.letter));
        });
    }

    scrollToLetter(letter) {
        const developers = this.filteredDevelopers;
        const index = developers.findIndex(dev => 
            dev.name.charAt(0).toUpperCase() === letter ||
            (letter === 'А' && 'AEIOU'.includes(dev.name.charAt(0)))
        );
        
        if (index !== -1) {
            const pageToGo = Math.floor(index / this.perPage) + 1;
            if (pageToGo !== this.currentPage) {
                this.goToPage(pageToGo);
                setTimeout(() => this.scrollToDeveloperCard(index % this.perPage), 300);
            } else {
                this.scrollToDeveloperCard(index % this.perPage);
            }
        }
    }

    scrollToDeveloperCard(position) {
        const cards = document.querySelectorAll('.developer-card');
        if (cards[position]) {
            cards[position].scrollIntoView({ behavior: 'smooth', block: 'start' });
            cards[position].style.boxShadow = '0 0 0 3px rgba(167, 139, 250, 0.5)';
            setTimeout(() => {
                cards[position].style.boxShadow = '';
            }, 2000);
        }
    }

    /**
     * Отрисовка каталога
     */
    render() {
        const catalog = document.getElementById('catalog');
        if (!catalog) return;
        
        this.getFilteredDevelopers();
        this.renderAlphabetNav();
        this.updateResultsCounter();
        this.renderPagination();
        
        const paginatedDevs = this.getPaginatedDevelopers();
        
        if (paginatedDevs.length === 0) {
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
            if (clearBtn) clearBtn.addEventListener('click', () => this.clearSearch());
            return;
        }
        
        catalog.innerHTML = paginatedDevs.map(dev => 
            renderDeveloperCard(dev, this.database.contacts, this.collapseState[dev.name] !== false)
        ).join('');
        
        this.attachEventHandlers();
    }

    /**
     * Прикрепление обработчиков событий
     */
    attachEventHandlers() {
        const developerHeaders = document.querySelectorAll('[data-toggle="developer"]');
        developerHeaders.forEach(header => {
            header.removeEventListener('click', this.handleDeveloperToggle);
            header.addEventListener('click', this.handleDeveloperToggle);
        });
        
        const complexHeaders = document.querySelectorAll('[data-toggle="complex"]');
        complexHeaders.forEach(header => {
            header.removeEventListener('click', this.handleComplexToggle);
            header.addEventListener('click', this.handleComplexToggle);
        });
        
        const copyBtns = document.querySelectorAll('[data-copy]');
        copyBtns.forEach(btn => {
            btn.removeEventListener('click', this.handleCopy);
            btn.addEventListener('click', this.handleCopy);
        });
    }

    handleDeveloperToggle = (event) => {
        const card = event.currentTarget.closest('.developer-card');
        if (card) {
            card.classList.toggle('collapsed');
            const developerName = card.dataset.developer;
            const isCollapsed = card.classList.contains('collapsed');
            this.collapseState[developerName] = !isCollapsed;
            this.saveCollapseState();
        }
    }

    handleComplexToggle = (event) => {
        const item = event.currentTarget.closest('.complex-item');
        if (item) item.classList.toggle('collapsed');
    }

    handleCopy = (event) => {
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
     * НОВОЕ: Развернуть всё
     */
    expandAll() {
        document.querySelectorAll('.developer-card').forEach(card => {
            card.classList.remove('collapsed');
            const developerName = card.dataset.developer;
            if (developerName) this.collapseState[developerName] = true;
        });
        document.querySelectorAll('.complex-item').forEach(item => {
            item.classList.remove('collapsed');
        });
        this.saveCollapseState();
        showToast('✅ Все группы развёрнуты');
    }

    /**
     * НОВОЕ: Свернуть всё
     */
    collapseAll() {
        document.querySelectorAll('.developer-card').forEach(card => {
            card.classList.add('collapsed');
            const developerName = card.dataset.developer;
            if (developerName) this.collapseState[developerName] = false;
        });
        document.querySelectorAll('.complex-item').forEach(item => {
            item.classList.add('collapsed');
        });
        this.saveCollapseState();
        showToast('✅ Все группы свёрнуты');
    }

    /**
     * НОВОЕ: Кнопка "Наверх"
     */
    setupScrollTopButton() {
        const btn = document.getElementById('scrollTopBtn');
        if (!btn) return;
        
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                btn.classList.add('visible');
            } else {
                btn.classList.remove('visible');
            }
        });
        
        btn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    clearSearch() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        this.searchQuery = '';
        this.currentPage = 1;
        this.render();
    }

    setupEventListeners() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentCategory = tab.dataset.category;
                this.currentPage = 1;
                this.render();
            });
        });
        
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.searchQuery = searchInput?.value.trim() || '';
                this.currentPage = 1;
                this.render();
            });
        }
        
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchQuery = searchInput.value.trim();
                    this.currentPage = 1;
                    this.render();
                }
            });
        }
        
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.currentCategory = categoryFilter.value;
                this.currentPage = 1;
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
        
        // НОВОЕ: кнопки развернуть/свернуть всё
        const expandAllBtn = document.getElementById('expandAllBtn');
        const collapseAllBtn = document.getElementById('collapseAllBtn');
        
        if (expandAllBtn) expandAllBtn.addEventListener('click', () => this.expandAll());
        if (collapseAllBtn) collapseAllBtn.addEventListener('click', () => this.collapseAll());
        
        // НОВОЕ: переключение темы
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => toggleTheme());
        }
    }

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
        } else if (category === 'suburban') {
            this.currentCategory = 'suburban';
            const suburbanTab = document.querySelector('.tab[data-category="suburban"]');
            if (suburbanTab) {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                suburbanTab.classList.add('active');
            }
        }
    }

    async init() {
        if (this.isInitialized) return;
        
        // Инициализация темы
        initTheme();
        
        const catalog = document.getElementById('catalog');
        if (catalog) {
            catalog.innerHTML = `<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Загрузка данных...</p></div>`;
        }
        
        this.database = await loadCatalogData();
        this.loadCollapseState();
        this.setupEventListeners();
        this.setupScrollTopButton();
        this.handleUrlCategory();
        this.render();
        
        this.isInitialized = true;
        console.log('✅ Каталог инициализирован с новыми функциями и темой');
    }
}

const catalog = new Catalog();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => catalog.init());
} else {
    catalog.init();
}

export default catalog;
