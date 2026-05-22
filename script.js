let cachedData = null;
let lastUpdateDate = null;
let lastSearchQuery = '';
let lastSearchType = 'all';
let lastResults = [];

// ========== НОВЫЙ URL ВЕБ-ПРИЛОЖЕНИЯ ==========
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxOuwNQOD1399I-J40XGadjhjFLFsdLLx1G78insQ4wOd9nkANL0bb221kTU8bJnsGkeg/exec';

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

/**
 * Экранирование HTML специальных символов (защита от XSS)
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Показать уведомление
 */
function showToast(message, isError = false) {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.background = isError ? 'rgba(239, 68, 68, 0.9)' : 'rgba(0, 0, 0, 0.9)';
    toast.style.position = 'fixed';
    toast.style.bottom = '30px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '48px';
    toast.style.color = 'white';
    toast.style.zIndex = '1000';
    toast.style.fontSize = '14px';
    toast.innerHTML = escapeHtml(message);
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

// ========== АНИМАЦИИ ЗАГРУЗКИ ==========
function showSkeleton() {
    const resultsDiv = document.getElementById('results');
    if (!resultsDiv) return;
    
    const skeletonHtml = `
        <div class="skeleton-card">
            <div class="skeleton-title"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
            <div class="skeleton-line"></div>
        </div>
        <div class="skeleton-card">
            <div class="skeleton-title"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
            <div class="skeleton-line"></div>
        </div>
    `;
    resultsDiv.innerHTML = skeletonHtml;
}

function showSpinner() {
    const resultsDiv = document.getElementById('results');
    if (!resultsDiv) return;
    
    resultsDiv.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <div class="loading-text">Загрузка данных...</div>
        </div>
    `;
}

// ========== УМНАЯ НОРМАЛИЗАЦИЯ ==========
function normalizeForSearch(text) {
    if (!text) return '';
    
    let normalized = text.toLowerCase().trim();
    normalized = normalized.replace(/\s+/g, ' ');
    normalized = normalized.replace(/[-–—.\/\\]/g, ' ');
    normalized = normalized.replace(/[()\"'`]/g, '');
    
    const replacements = {
        'кпд газстрой': 'кпд-газстрой',
        'кпдгазстрой': 'кпд-газстрой',
        'гпд газстрой': 'кпд-газстрой',
        'гпдгазстрой': 'кпд-газстрой',
        'кпд газстройй': 'кпд-газстрой',
        'газстрой': 'кпд-газстрой',
        'вира': 'vira',
        'vira': 'вира',
        'расцветай': 'расцветай',
        'брусника': 'брусника',
        'страна девелопмент': 'страна.девелопмент',
        'страна береговая': 'страна.береговая',
        'ред фокс': 'red fox',
        'redfox': 'red fox',
        'фридом сити': 'freedom city',
        'счастье в кольцово': 'счастье в кольцово',
        'грустника': 'брусника',
        'грусника': 'брусника'
    };
    
    for (let [key, value] of Object.entries(replacements)) {
        if (normalized.includes(key)) {
            normalized = normalized.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
        }
    }
    
    return normalized;
}

function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i-1) === a.charAt(j-1)) {
                matrix[i][j] = matrix[i-1][j-1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i-1][j-1] + 1,
                    matrix[i][j-1] + 1,
                    matrix[i-1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function isSimilar(str1, str2) {
    if (!str1 || !str2) return false;
    const distance = levenshteinDistance(str1, str2);
    const maxLen = Math.max(str1.length, str2.length);
    const maxDistance = Math.min(3, Math.floor(maxLen * 0.3));
    return distance <= maxDistance;
}

// ========== ЗАГРУЗКА ДАННЫХ ==========
async function loadData() {
    if (cachedData) return cachedData;
    
    try {
        console.log('🔄 Загрузка данных из Google Sheets...');
        const response = await fetch(GOOGLE_SHEETS_URL + '?t=' + Date.now());
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Таблица пуста или не содержит данных');
        }
        
        cachedData = data;
        lastUpdateDate = new Date();
        console.log(`✅ Данные загружены из Google Sheets: ${data.length} записей`);
        return data;
        
    } catch (err) {
        console.error('❌ Ошибка загрузки из Google Sheets:', err);
        
        // Пробуем загрузить из localStorage
        try {
            const saved = localStorage.getItem('searchDataCache');
            if (saved) {
                const cached = JSON.parse(saved);
                if (cached.data && cached.data.length > 0 && cached.timestamp) {
                    const cacheAge = Date.now() - cached.timestamp;
                    if (cacheAge < 24 * 60 * 60 * 1000) { // кэш на 24 часа
                        console.log('📦 Использованы кэшированные данные из localStorage');
                        cachedData = cached.data;
                        lastUpdateDate = new Date(cached.timestamp);
                        showToast('Данные из кэша (Google Sheets недоступен)', false);
                        return cachedData;
                    }
                }
            }
        } catch (e) {
            console.warn('Не удалось загрузить кэш:', e);
        }
        
        throw new Error('Не удалось загрузить данные. Проверьте интернет-соединение.');
    }
}

/**
 * Сохранение данных в localStorage (кэш)
 */
function saveToLocalStorage(data) {
    try {
        localStorage.setItem('searchDataCache', JSON.stringify({
            data: data,
            timestamp: Date.now()
        }));
        console.log('💾 Данные сохранены в localStorage');
    } catch (e) {
        console.warn('Не удалось сохранить кэш:', e);
    }
}

// ========== ГЕНЕРАЦИЯ ССЫЛКИ ДЛЯ ПОДЕЛИТЬСЯ ==========
function generateShareLink() {
    const url = new URL(window.location.href);
    if (lastSearchQuery) url.searchParams.set('q', lastSearchQuery);
    if (lastSearchType && lastSearchType !== 'all') url.searchParams.set('t', lastSearchType);
    return url.toString();
}

function shareResult() {
    const link = generateShareLink();
    navigator.clipboard.writeText(link).then(() => {
        showToast('✅ Ссылка скопирована! Отправьте её коллеге.');
    }).catch(() => {
        showToast('❌ Не удалось скопировать ссылку', true);
    });
}

// ========== ЗАГРУЗКА ПАРАМЕТРОВ ИЗ URL ==========
function loadParamsFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    const type = urlParams.get('t');
    
    const searchInput = document.getElementById('searchInput');
    const searchType = document.getElementById('searchType');
    
    if (query && searchInput) {
        searchInput.value = query;
    }
    if (type && ['all', 'complex', 'developer', 'manager'].includes(type) && searchType) {
        searchType.value = type;
    }
    
    if (query) {
        setTimeout(() => search(), 100);
    }
}

// ========== ОСНОВНОЙ ПОИСК ==========
async function search() {
    const searchInput = document.getElementById('searchInput');
    const searchType = document.getElementById('searchType');
    const resultsDiv = document.getElementById('results');
    const statsDiv = document.getElementById('stats');
    const shareBtn = document.getElementById('shareBtn');
    
    if (!searchInput || !resultsDiv) return;
    
    const query = searchInput.value.trim();
    const searchTypeValue = searchType ? searchType.value : 'all';
    
    lastSearchQuery = query;
    lastSearchType = searchTypeValue;
    
    if (!query) {
        resultsDiv.innerHTML = '<div class="loading">Введите запрос для поиска</div>';
        if (statsDiv) statsDiv.style.display = 'none';
        if (shareBtn) shareBtn.style.display = 'none';
        return;
    }
    
    showSpinner();
    if (shareBtn) shareBtn.style.display = 'none';
    
    try {
        const data = await loadData();
        saveToLocalStorage(data); // сохраняем в кэш после успешной загрузки
        
        const normalizedQuery = normalizeForSearch(query);
        
        // 1. Сначала ищем точные совпадения
        let exactMatches = data.filter(item => {
            const complex = normalizeForSearch(item['Название ЖК'] || '');
            const developer = normalizeForSearch(item['Застройщик'] || '');
            const manager = normalizeForSearch(item['Менеджер'] || '');
            
            switch(searchTypeValue) {
                case 'complex': return complex.includes(normalizedQuery);
                case 'developer': return developer.includes(normalizedQuery);
                case 'manager': return manager.includes(normalizedQuery);
                default: return complex.includes(normalizedQuery) || developer.includes(normalizedQuery) || manager.includes(normalizedQuery);
            }
        });
        
        let fuzzyMatches = [];
        let suggestions = [];
        let gptUsed = false;
        let gptMessage = '';
        
        // 2. Если точных совпадений нет — пробуем YandexGPT
        if (exactMatches.length === 0) {
            console.log('Точных совпадений нет, пробуем GPT для запроса:', query);
            try {
                const gptResult = await semanticSearchWithGPT(query);
                
                if (gptResult && gptResult.value && !gptResult.error) {
                    let searchField = '';
                    if (gptResult.type === 'ЖК') searchField = 'Название ЖК';
                    else if (gptResult.type === 'застройщик') searchField = 'Застройщик';
                    else if (gptResult.type === 'менеджер') searchField = 'Менеджер';
                    else if (gptResult.type === 'semantic') searchField = 'Адрес ЖК';
                    
                    if (searchField) {
                        const gptMatches = data.filter(item => {
                            const fieldValue = item[searchField] || '';
                            return normalizeForSearch(fieldValue).includes(normalizeForSearch(gptResult.value));
                        });
                        
                        if (gptMatches.length > 0) {
                            exactMatches = gptMatches;
                            gptUsed = true;
                            gptMessage = `${gptResult.type} — ${gptResult.value}`;
                        }
                    }
                }
            } catch (gptErr) {
                console.warn('GPT не ответил:', gptErr);
            }
        }
        
        // 3. Если GPT не помог — ищем похожие по расстоянию Левенштейна
        if (exactMatches.length === 0) {
            const allComplexes = [...new Set(data.map(d => d['Название ЖК']).filter(Boolean))];
            const allDevelopers = [...new Set(data.map(d => d['Застройщик']).filter(Boolean))];
            const allManagers = [...new Set(data.map(d => d['Менеджер']).filter(Boolean))];
            const allValues = [...new Set([...allComplexes, ...allDevelopers, ...allManagers])];
            
            for (let value of allValues) {
                const normalizedValue = normalizeForSearch(value);
                if (isSimilar(normalizedValue, normalizedQuery)) {
                    suggestions.push(value);
                    if (suggestions.length >= 3) break;
                }
            }
            
            if (suggestions.length > 0) {
                const suggestionQuery = normalizeForSearch(suggestions[0]);
                fuzzyMatches = data.filter(item => {
                    const complex = normalizeForSearch(item['Название ЖК'] || '');
                    const developer = normalizeForSearch(item['Застройщик'] || '');
                    const manager = normalizeForSearch(item['Менеджер'] || '');
                    
                    switch(searchTypeValue) {
                        case 'complex': return complex === suggestionQuery;
                        case 'developer': return developer === suggestionQuery;
                        case 'manager': return manager === suggestionQuery;
                        default: return complex === suggestionQuery || developer === suggestionQuery || manager === suggestionQuery;
                    }
                }).slice(0, 20);
            }
        }
        
        const results = exactMatches.length > 0 ? exactMatches : fuzzyMatches;
        lastResults = results;
        
        // Обновляем статистику
        if (statsDiv) {
            statsDiv.style.display = 'flex';
            const updateDate = lastUpdateDate ? lastUpdateDate.toLocaleDateString('ru-RU') : 'сегодня';
            statsDiv.innerHTML = `
                <span><i class="fas fa-database"></i> Всего: ${data.length}</span>
                <span><i class="fas fa-search"></i> Найдено: ${results.length}</span>
                <span><i class="fas fa-calendar-alt"></i> Обновлено: ${updateDate}</span>
            `;
        }
        
        // Отображаем результаты
        if (results.length === 0) {
            let suggestionHtml = '';
            if (suggestions.length > 0) {
                suggestionHtml = `<div class="suggestion"><i class="fas fa-lightbulb"></i> Возможно, вы искали: ${suggestions.slice(0, 3).map(s => `<strong>${escapeHtml(s)}</strong>`).join(', ')}</div>`;
            }
            
            resultsDiv.innerHTML = `
                <div class="not-found">
                    <i class="fas fa-frown"></i> Ничего не найдено по запросу "${escapeHtml(query)}"
                    ${suggestionHtml}
                </div>
            `;
            if (shareBtn) shareBtn.style.display = 'none';
            return;
        }
        
        let html = '';
        
        if (gptUsed) {
            html += `<div class="suggestion"><i class="fas fa-magic"></i> Алиса подсказала: ищем "${escapeHtml(gptMessage)}"</div>`;
        } else if (exactMatches.length === 0 && fuzzyMatches.length > 0 && suggestions.length > 0) {
            html += `<div class="suggestion"><i class="fas fa-lightbulb"></i> Найдено по похожему названию: "${escapeHtml(suggestions[0])}"</div>`;
        }
        
        results.slice(0, 50).forEach(item => {
            const phone = item['Телефон'] || '';
            const complex = item['Название ЖК'] || '';
            const developer = item['Застройщик'] || '';
            const manager = item['Менеджер'] || '';
            const address = item['Адрес ЖК'] || '';
            
            html += `<div class="result-card">`;
            
            if (complex && complex.trim() !== '') {
                html += `<strong><i class="fas fa-building"></i> ${escapeHtml(complex)}</strong><br>`;
            }
            if (developer && developer.trim() !== '') {
                html += `<i class="fas fa-hard-hat"></i> Застройщик: ${escapeHtml(developer)}<br>`;
            }
            if (manager && manager.trim() !== '' && manager !== 'Общий телефон' && manager !== 'Телефон ОП') {
                html += `<i class="fas fa-user-tie"></i> Менеджер: ${escapeHtml(manager)}<br>`;
            }
            if (phone) {
                const cleanPhone = phone.replace(/[^0-9+]/g, '');
                html += `<i class="fas fa-phone-alt"></i> Телефон: <a href="tel:${cleanPhone}" style="color: #a78bfa; text-decoration: none;">${escapeHtml(phone)}</a><br>`;
                html += `<button class="copy-btn" data-phone="${phone.replace(/'/g, "\\'").replace(/"/g, '&quot;')}"><i class="fas fa-copy"></i> Копировать телефон</button>`;
            }
            if (address && address.trim() !== '') {
                html += `<br><i class="fas fa-map-marker-alt"></i> Адрес: ${escapeHtml(address)}`;
            }
            
            html += `</div>`;
        });
        
        resultsDiv.innerHTML = html;
        if (shareBtn) shareBtn.style.display = 'inline-flex';
        
        // Прикрепляем обработчики для кнопок копирования
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const phone = btn.getAttribute('data-phone');
                if (phone) {
                    navigator.clipboard.writeText(phone).then(() => {
                        const originalText = btn.innerHTML;
                        btn.innerHTML = '<i class="fas fa-check"></i> Скопировано!';
                        setTimeout(() => { btn.innerHTML = originalText; }, 1500);
                        showToast('✅ Телефон скопирован');
                    }).catch(() => {
                        showToast('❌ Не удалось скопировать', true);
                    });
                }
            });
        });
        
    } catch (err) {
        console.error('Ошибка поиска:', err);
        resultsDiv.innerHTML = `<div class="error"><i class="fas fa-exclamation-triangle"></i> Ошибка: ${escapeHtml(err.message)}</div>`;
        if (statsDiv) statsDiv.style.display = 'none';
        if (shareBtn) shareBtn.style.display = 'none';
        showToast(err.message, true);
    }
}

// ========== YANDEX GPT (опционально) ==========
async function semanticSearchWithGPT(query) {
    // Функция временно отключена, так как требует API-ключ
    // Если нужна — раскомментируйте и добавьте ваш URL функции
    console.log('GPT поиск временно отключен');
    return null;
    
    /* Оригинальный код:
    const functionUrl = 'https://functions.yandexcloud.net/d4e8ml02jm9jo70umv0h';
    
    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query })
        });
        
        if (!response.ok) return null;
        return await response.json();
    } catch (err) {
        console.error('Ошибка вызова GPT:', err);
        return null;
    }
    */
}

// ========== ПРОВЕРКА СТАТУСА ==========
async function check() {
    showSpinner();
    const resultsDiv = document.getElementById('results');
    const statsDiv = document.getElementById('stats');
    
    try {
        const data = await loadData();
        saveToLocalStorage(data);
        
        if (statsDiv) {
            statsDiv.style.display = 'flex';
            const updateDate = lastUpdateDate ? lastUpdateDate.toLocaleDateString('ru-RU') : 'сегодня';
            statsDiv.innerHTML = `
                <span><i class="fas fa-database"></i> Всего: ${data.length}</span>
                <span><i class="fas fa-check-circle"></i> Готов к поиску</span>
                <span><i class="fas fa-calendar-alt"></i> Обновлено: ${updateDate}</span>
            `;
        }
        
        if (resultsDiv) {
            resultsDiv.innerHTML = '<div class="success"><i class="fas fa-check-circle"></i> Данные загружены! Введите запрос для поиска.</div>';
        }
        
        loadParamsFromUrl();
        
    } catch (err) {
        console.error('Ошибка загрузки:', err);
        if (resultsDiv) {
            resultsDiv.innerHTML = `<div class="error"><i class="fas fa-exclamation-triangle"></i> ${escapeHtml(err.message)}<br>Проверьте доступ к Google Sheets или интернет-соединение.</div>`;
        }
        if (statsDiv) statsDiv.style.display = 'none';
        showToast(err.message, true);
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    check();
    
    const searchBtn = document.getElementById('searchBtn');
    const shareBtn = document.getElementById('shareBtn');
    const searchInput = document.getElementById('searchInput');
    
    if (searchBtn) searchBtn.addEventListener('click', search);
    if (shareBtn) shareBtn.addEventListener('click', shareResult);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') search();
        });
    }
});
