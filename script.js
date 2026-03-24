let cachedData = null;
let lastUpdateDate = null;
let lastSearchQuery = '';
let lastSearchType = 'all';
let lastResults = [];

// ========== АНИМАЦИИ ЗАГРУЗКИ ==========
function showSkeleton() {
    const resultsDiv = document.getElementById('results');
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
    resultsDiv.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <div class="loading-text">Загрузка данных...</div>
        </div>
    `;
}

function showToast(message, isError = false) {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.background = isError ? 'rgba(239, 68, 68, 0.9)' : 'rgba(0, 0, 0, 0.9)';
    toast.innerHTML = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
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
        'расцветай на красном': 'расцветай на красном',
        'расцветай на зорге': 'расцветай на зорге',
        'брусника': 'брусника',
        'страна девелопмент': 'страна.девелопмент',
        'страна береговая': 'страна.береговая',
        'ред фокс': 'red fox',
        'redfox': 'red fox',
        'фридом сити': 'freedom city',
        'счастье в кольцово': 'счастье в кольцово'
    };
    
    for (let [key, value] of Object.entries(replacements)) {
        if (normalized.includes(key)) {
            normalized = normalized.replace(new RegExp(key, 'g'), value);
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
                matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, matrix[i][j-1] + 1, matrix[i-1][j] + 1);
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

async function loadData() {
    if (cachedData) return cachedData;
    
    const response = await fetch('data.csv');
    const csvText = await response.text();
    
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const row = [];
        let inQuotes = false;
        let current = '';
        
        for (let char of lines[i]) {
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
        
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            let value = row[j] ? row[j].replace(/^"|"$/g, '') : '';
            obj[headers[j]] = value;
        }
        data.push(obj);
    }
    
    cachedData = data;
    lastUpdateDate = new Date();
    return data;
}

// ========== ВЫЗОВ YANDEXGPT ==========
async function semanticSearchWithGPT(query) {
    const functionUrl = 'https://functions.yandexcloud.net/d4e8ml02jm9jo70umv0h';
    
    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: query })
        });
        
        if (!response.ok) {
            console.error('GPT функция вернула ошибку:', response.status);
            return null;
        }
        
        const data = await response.json();
        console.log('GPT ответ:', data);
        return data;
    } catch (err) {
        console.error('Ошибка вызова GPT:', err);
        return null;
    }
}

// ========== ГЕНЕРАЦИЯ ССЫЛКИ ДЛЯ ПОДЕЛИТЬСЯ ==========
function generateShareLink() {
    const url = new URL(window.location.href);
    url.searchParams.set('q', lastSearchQuery);
    url.searchParams.set('t', lastSearchType);
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
    
    if (query) {
        document.getElementById('searchInput').value = query;
        if (type && ['all', 'complex', 'developer', 'manager'].includes(type)) {
            document.getElementById('searchType').value = type;
        }
        setTimeout(() => search(), 100);
    }
}

async function search() {
    const query = document.getElementById('searchInput').value.trim();
    const searchType = document.getElementById('searchType').value;
    const resultsDiv = document.getElementById('results');
    const statsDiv = document.getElementById('stats');
    const shareBtn = document.getElementById('shareBtn');
    
    lastSearchQuery = query;
    lastSearchType = searchType;
    
    if (!query) {
        resultsDiv.innerHTML = '<div class="loading">Введите запрос для поиска</div>';
        statsDiv.style.display = 'none';
        shareBtn.style.display = 'none';
        return;
    }
    
    showSpinner();
    shareBtn.style.display = 'none';
    
    try {
        const data = await loadData();
        const normalizedQuery = normalizeForSearch(query);
        
        let exactMatches = data.filter(item => {
            const complex = normalizeForSearch(item['Название ЖК'] || '');
            const developer = normalizeForSearch(item['Застройщик'] || '');
            const manager = normalizeForSearch(item['Менеджер'] || '');
            
            switch(searchType) {
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
        
        // Если точных совпадений нет — пробуем GPT
        if (exactMatches.length === 0) {
            console.log('Точных совпадений нет, пробуем GPT...');
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
        }
        
        // Если GPT не помог — ищем похожие
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
                fuzzyMatches = data.filter(item => {
                    const complex = normalizeForSearch(item['Название ЖК'] || '');
                    const developer = normalizeForSearch(item['Застройщик'] || '');
                    const manager = normalizeForSearch(item['Менеджер'] || '');
                    const suggestionQuery = normalizeForSearch(suggestions[0]);
                    
                    switch(searchType) {
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
        
        statsDiv.style.display = 'flex';
        statsDiv.innerHTML = `
            <span><i class="fas fa-database"></i> Всего: ${data.length}</span>
            <span><i class="fas fa-search"></i> Найдено: ${results.length}</span>
            <span><i class="fas fa-calendar-alt"></i> Обновлено: ${lastUpdateDate.toLocaleDateString()}</span>
        `;
        
        if (results.length === 0) {
            let suggestionHtml = '';
            if (suggestions.length > 0) {
                suggestionHtml = `<div class="suggestion"><i class="fas fa-lightbulb"></i> Возможно, вы искали: ${suggestions.slice(0, 3).map(s => `<strong>${s}</strong>`).join(', ')}</div>`;
            }
            
            resultsDiv.innerHTML = `
                <div class="not-found">
                    <i class="fas fa-frown"></i> Ничего не найдено по запросу "${query}"
                    ${suggestionHtml}
                </div>
            `;
            shareBtn.style.display = 'none';
            return;
        }
        
        let html = '';
        
        // Подсказка от Алисы (если использовалась)
        if (gptUsed) {
            html += `<div class="suggestion"><i class="fas fa-magic"></i> Алиса подсказала: ищем "${gptMessage}"</div>`;
        }
        // Подсказка от fuzzy-поиска
        else if (exactMatches.length === 0 && fuzzyMatches.length > 0) {
            html += `<div class="suggestion"><i class="fas fa-lightbulb"></i> Найдено по похожему названию: "${suggestions[0]}"</div>`;
        }
        
        results.slice(0, 50).forEach(item => {
            const phone = item['Телефон'] || '';
            html += `<div class="result-card">`;
            
            if (item['Название ЖК'] && item['Название ЖК'].trim() !== '') {
                html += `<strong><i class="fas fa-building"></i> ${item['Название ЖК']}</strong><br>`;
            }
            if (item['Застройщик'] && item['Застройщик'].trim() !== '') {
                html += `<i class="fas fa-hard-hat"></i> Застройщик: ${item['Застройщик']}<br>`;
            }
            if (item['Менеджер'] && item['Менеджер'].trim() !== '' && item['Менеджер'] !== 'Общий телефон') {
                html += `<i class="fas fa-user-tie"></i> Менеджер: ${item['Менеджер']}<br>`;
            }
            if (phone) {
                html += `<i class="fas fa-phone-alt"></i> Телефон: <a href="tel:${phone.replace(/[^0-9+]/g, '')}" style="color: #a78bfa; text-decoration: none;">${phone}</a><br>`;
                html += `<button class="copy-btn" data-phone="${phone.replace(/'/g, "\\'")}"><i class="fas fa-copy"></i> Копировать телефон</button>`;
            }
            if (item['Адрес ЖК'] && item['Адрес ЖК'].trim() !== '') {
                html += `<br><i class="fas fa-map-marker-alt"></i> Адрес: ${item['Адрес ЖК']}`;
            }
            
            html += `</div>`;
        });
        
        resultsDiv.innerHTML = html;
        shareBtn.style.display = 'inline-flex';
        
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const phone = btn.getAttribute('data-phone');
                navigator.clipboard.writeText(phone).then(() => {
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-check"></i> Скопировано!';
                    setTimeout(() => { btn.innerHTML = originalText; }, 1500);
                }).catch(() => {
                    showToast('Не удалось скопировать', true);
                });
            });
        });
        
    } catch (err) {
        resultsDiv.innerHTML = `<div class="error"><i class="fas fa-exclamation-triangle"></i> Ошибка: ${err.message}</div>`;
        statsDiv.style.display = 'none';
        shareBtn.style.display = 'none';
    }
}

async function check() {
    showSpinner();
    try {
        const data = await loadData();
        document.getElementById('stats').style.display = 'flex';
        document.getElementById('stats').innerHTML = `
            <span><i class="fas fa-database"></i> Всего: ${data.length}</span>
            <span><i class="fas fa-check-circle"></i> Готов к поиску</span>
            <span><i class="fas fa-calendar-alt"></i> Обновлено: ${lastUpdateDate.toLocaleDateString()}</span>
        `;
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = '<div class="success"><i class="fas fa-check-circle"></i> Данные загружены! Введите запрос для поиска.</div>';
        
        loadParamsFromUrl();
    } catch (err) {
        resultsDiv.innerHTML = `<div class="error"><i class="fas fa-exclamation-triangle"></i> ${err.message}<br>Файл data.csv не найден</div>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    check();
    document.getElementById('searchBtn').addEventListener('click', search);
    document.getElementById('shareBtn').addEventListener('click', shareResult);
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') search();
    });
});
