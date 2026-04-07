/**
 * Точка входа для админ-панели
 * Версия: 3.0
 */

import { AdminPanel } from '/realty-search/pages/modules/adminPanel.js';

const adminPanel = new AdminPanel();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => adminPanel.init());
} else {
    adminPanel.init();
}

export default adminPanel;
