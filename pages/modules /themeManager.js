/**
 * Модуль управления темами
 * Версия: 1.0
 * Описание: Переключение между темной и светлой темой, сохранение выбора
 * 
 * Экспортируемые функции:
 * - initTheme() - инициализация темы при загрузке
 * - toggleTheme() - переключение темы
 * - getCurrentTheme() - получение текущей темы
 */

// Константы
const STORAGE_KEY = 'adminTheme';
const DARK_THEME = 'dark';
const LIGHT_THEME = 'light';

/**
 * Получение сохраненной темы из localStorage
 * @returns {string} - 'dark' или 'light'
 */
function getSavedTheme() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === DARK_THEME || saved === LIGHT_THEME) {
            return saved;
        }
        // Проверяем системные настройки
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return DARK_THEME;
        }
        return DARK_THEME; // По умолчанию темная
    } catch (e) {
        return DARK_THEME;
    }
}

/**
 * Применение темы к body
 * @param {string} theme - 'dark' или 'light'
 */
function applyTheme(theme) {
    const body = document.body;
    const themeToggleIcon = document.querySelector('#themeToggle i');
    
    if (theme === DARK_THEME) {
        body.classList.remove(LIGHT_THEME);
        body.classList.add(DARK_THEME);
        if (themeToggleIcon) {
            themeToggleIcon.className = 'fas fa-moon';
        }
    } else {
        body.classList.remove(DARK_THEME);
        body.classList.add(LIGHT_THEME);
        if (themeToggleIcon) {
            themeToggleIcon.className = 'fas fa-sun';
        }
    }
}

/**
 * Сохранение темы в localStorage
 * @param {string} theme - 'dark' или 'light'
 */
function saveTheme(theme) {
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
        console.warn('Не удалось сохранить тему:', e);
    }
}

/**
 * Инициализация темы при загрузке страницы
 * @returns {string} - Текущая тема
 */
export function initTheme() {
    const savedTheme = getSavedTheme();
    applyTheme(savedTheme);
    console.log(`🎨 Тема инициализирована: ${savedTheme === DARK_THEME ? '🌙 Темная' : '☀️ Светлая'}`);
    return savedTheme;
}

/**
 * Переключение темы (темная ↔ светлая)
 * @returns {string} - Новая тема
 */
export function toggleTheme() {
    const body = document.body;
    const isDark = !body.classList.contains(LIGHT_THEME);
    const newTheme = isDark ? LIGHT_THEME : DARK_THEME;
    
    applyTheme(newTheme);
    saveTheme(newTheme);
    
    console.log(`🎨 Тема переключена: ${newTheme === DARK_THEME ? '🌙 Темная' : '☀️ Светлая'}`);
    return newTheme;
}

/**
 * Получение текущей темы
 * @returns {string} - 'dark' или 'light'
 */
export function getCurrentTheme() {
    const body = document.body;
    return body.classList.contains(LIGHT_THEME) ? LIGHT_THEME : DARK_THEME;
}

/**
 * Подписка на изменение системной темы (опционально)
 * @param {Function} callback - Функция при изменении системной темы
 */
export function watchSystemTheme(callback) {
    if (window.matchMedia) {
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        darkModeQuery.addEventListener('change', (e) => {
            // Только если пользователь явно не выбирал тему
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) {
                const newTheme = e.matches ? DARK_THEME : LIGHT_THEME;
                applyTheme(newTheme);
                if (callback) callback(newTheme);
            }
        });
    }
}
