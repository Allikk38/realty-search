/**
 * Модуль UI утилит
 * Версия: 1.0
 * Описание: Вспомогательные функции для работы с интерфейсом
 * 
 * Экспортируемые функции:
 * - escapeHtml() - экранирование HTML спецсимволов
 * - formatPhone() - форматирование номера телефона
 * - showToast() - показать всплывающее уведомление
 * - cleanName() - очистка названия от мусора
 * - debounce() - debounce для поиска
 */

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
 * Форматирование номера телефона
 * @param {string} phone - Номер телефона в любом формате
 * @returns {string} - Отформатированный номер или пустая строка
 */
export function formatPhone(phone) {
    if (!phone || phone === 'Общий телефон' || phone === 'Телефон ОП') return '';
    
    // Убираем всё кроме цифр и плюса
    let cleaned = String(phone).replace(/[^\d+]/g, '');
    
    // Обработка 8-ки (8ХХХХХХХХХ -> +7ХХХХХХХХХ)
    if (cleaned.startsWith('8') && cleaned.length === 11) {
        cleaned = '+7' + cleaned.slice(1);
    }
    
    // Обработка 7-ки без плюса (7ХХХХХХХХХХ -> +7ХХХХХХХХХХ)
    if (cleaned.startsWith('7') && cleaned.length === 11 && !cleaned.startsWith('+')) {
        cleaned = '+' + cleaned;
    }
    
    // Обработка 10 цифр без кода (ХХХХХХХХХХ -> +7ХХХХХХХХХХ)
    if (cleaned.length === 10 && !cleaned.startsWith('+')) {
        cleaned = '+7' + cleaned;
    }
    
    // Форматирование +7 XXX XXX-XX-XX
    if (cleaned.length === 12 && cleaned.startsWith('+7')) {
        return cleaned.replace(/(\+7)(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3-$4-$5');
    }
    
    // Если не удалось отформатировать, возвращаем как есть
    return phone;
}

/**
 * Показать всплывающее уведомление
 * @param {string} message - Текст уведомления
 * @param {boolean} isError - Флаг ошибки (красный фон)
 * @param {number} duration - Длительность показа в мс (по умолчанию 3000)
 */
export function showToast(message, isError = false, duration = 3000) {
    // Удаляем существующее уведомление
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    // Создаем новое
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    // Добавляем иконку в зависимости от типа
    const icon = isError ? '⚠️' : '✅';
    toast.innerHTML = `${icon} ${message}`;
    
    document.body.appendChild(toast);
    
    // Автоматическое удаление
    setTimeout(() => {
        if (toast && toast.parentNode) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 300);
        }
    }, duration);
}

/**
 * Очистка названия от мусора (Сайт, ТГ-канал, Realt.one)
 * @param {string} str - Входная строка
 * @returns {string} - Очищенная строка
 */
export function cleanName(str) {
    if (!str) return '';
    return str
        .replace(/Сайт|ТГ-канал|Realt\.one|\(с\)/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/**
 * Debounce для отложенного выполнения функции
 * @param {Function} func - Функция для выполнения
 * @param {number} delay - Задержка в мс
 * @returns {Function} - Обернутая функция с debounce
 */
export function debounce(func, delay = 300) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Генерация уникального ID
 * @returns {string} - Уникальный идентификатор
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Проверка валидности телефона
 * @param {string} phone - Номер телефона
 * @returns {boolean} - Валидный ли номер
 */
export function isValidPhone(phone) {
    if (!phone) return true; // Пустое поле допустимо
    const cleaned = phone.replace(/[^\d+]/g, '');
    // Проверяем что это +7XXXXXXXXXX (12 символов) или 8XXXXXXXXXX (11 символов)
    return /^(\+7|8)\d{10}$/.test(cleaned) || /^7\d{10}$/.test(cleaned);
}

/**
 * Транслитерация названия категории в отображаемый текст
 * @param {string} category - 'newbuild' или 'suburban'
 * @returns {object} - { icon, text }
 */
export function getCategoryDisplay(category) {
    if (category === 'suburban') {
        return { icon: '🏡', text: 'Загородная' };
    }
    return { icon: '🏢', text: 'Новостройка' };
}

/**
 * Транслитерация роли в отображаемый текст (сокращение)
 * @param {string} role - Полное название роли
 * @returns {string} - Сокращенное название
 */
export function shortenRole(role) {
    if (!role) return 'Менеджер';
    if (role === 'специалист по работе с партнерами') return 'Спец. по партнерам';
    if (role === 'руководитель ОП') return 'Рук. ОП';
    return role;
}
