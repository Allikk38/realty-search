/**
 * Точка входа для админ-панели
 * Версия: 3.0
 * Описание: Импортирует и запускает AdminPanel
 */

console.log('✅ contacts-manager.js загружен');
import { AdminPanel } from './modules/adminPanel.js';
console.log('✅ AdminPanel импортирован');

// Создаем экземпляр и инициализируем
const adminPanel = new AdminPanel();

// Запускаем после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => adminPanel.init());
} else {
    adminPanel.init();
}

// Экспортируем для возможного использования в консоли (отладка)
export default adminPanel;
