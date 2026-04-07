/**
 * Модуль UI утилит
 * Версия: 1.0
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

export function formatPhone(phone) {
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

export function showToast(message, isError = false, duration = 3000) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = isError ? '❌' : '✅';
    toast.innerHTML = `${icon} ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast && toast.parentNode) toast.remove();
    }, duration);
}

export function cleanName(str) {
    if (!str) return '';
    return str
        .replace(/Сайт|ТГ-канал|Realt\.one/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

export function debounce(func, delay = 300) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function getCategoryDisplay(category) {
    if (category === 'suburban') {
        return { icon: '🏡', text: 'Загородная' };
    }
    return { icon: '🏢', text: 'Новостройка' };
}

export function shortenRole(role) {
    if (!role) return 'Менеджер';
    if (role === 'специалист по работе с партнерами') return 'Спец. по партнерам';
    if (role === 'руководитель ОП') return 'Рук. ОП';
    return role;
}
