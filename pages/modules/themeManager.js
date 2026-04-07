/**
 * Модуль управления темами
 * Версия: 1.0
 */

const STORAGE_KEY = 'adminTheme';
const DARK_THEME = 'dark';
const LIGHT_THEME = 'light';

function getSavedTheme() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === DARK_THEME || saved === LIGHT_THEME) {
            return saved;
        }
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return DARK_THEME;
        }
        return DARK_THEME;
    } catch (e) {
        return DARK_THEME;
    }
}

function applyTheme(theme) {
    const body = document.body;
    const themeToggleIcon = document.querySelector('#themeToggle i');
    
    if (theme === DARK_THEME) {
        body.classList.remove(LIGHT_THEME);
        if (themeToggleIcon) themeToggleIcon.className = 'fas fa-moon';
    } else {
        body.classList.add(LIGHT_THEME);
        if (themeToggleIcon) themeToggleIcon.className = 'fas fa-sun';
    }
}

function saveTheme(theme) {
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
        console.warn('Не удалось сохранить тему:', e);
    }
}

export function initTheme() {
    const savedTheme = getSavedTheme();
    applyTheme(savedTheme);
    console.log(`🎨 Тема инициализирована: ${savedTheme === DARK_THEME ? 'Темная' : 'Светлая'}`);
    return savedTheme;
}

export function toggleTheme() {
    const body = document.body;
    const isDark = !body.classList.contains(LIGHT_THEME);
    const newTheme = isDark ? LIGHT_THEME : DARK_THEME;
    
    applyTheme(newTheme);
    saveTheme(newTheme);
    
    console.log(`🎨 Тема переключена: ${newTheme === DARK_THEME ? 'Темная' : 'Светлая'}`);
    return newTheme;
}

export function getCurrentTheme() {
    const body = document.body;
    return body.classList.contains(LIGHT_THEME) ? LIGHT_THEME : DARK_THEME;
}
