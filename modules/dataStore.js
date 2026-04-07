/**
 * Модуль управления данными (DataStore)
 * Версия: 1.0
 * Описание: Хранение и управление данными в плоской таблице
 * 
 * Экспортируемые классы/функции:
 * - DataStore - основной класс для работы с данными
 * - createEmptyRecord() - создание пустой записи
 */

import { formatPhone, cleanName, generateId } from './uiHelpers.js';

/**
 * Создание пустой записи (шаблон)
 * @returns {Object} - Пустая запись
 */
export function createEmptyRecord() {
    return {
        id: generateId(),
        developer: '',
        complex: '',
        address: '',
        opAddress: '',
        commonPhone: '',
        manager: '',
        managerPhone: '',
        role: 'менеджер',
        category: 'newbuild'
    };
}

/**
 * Класс DataStore
 * Управление плоской таблицей данных
 */
export class DataStore {
    constructor() {
        this.records = [];           // Все записи
        this.filteredRecords = [];   // Отфильтрованные записи
        this.developersSet = new Set(); // Уникальные застройщики
        
        // Параметры фильтрации
        this.searchQuery = '';
        this.filterDeveloper = '';
        this.filterCategory = '';
        
        // Параметры пагинации
        this.currentPage = 1;
        this.perPage = 20;
    }

    /**
     * Загрузка данных из localStorage
     * @returns {boolean} - Успех загрузки
     */
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('contactsDatabase');
            if (!saved) {
                console.log('Нет данных в localStorage');
                return false;
            }
            
            const db = JSON.parse(saved);
            this.records = [];
            
            // Конвертируем из формата {developers, contacts} в плоскую таблицу
            for (const [developer, devData] of Object.entries(db.developers || {})) {
                for (const complex of devData.complexes || []) {
                    // Запись с общим телефоном
                    if (devData.commonPhone) {
                        this.records.push({
                            id: generateId(),
                            developer: developer,
                            complex: complex,
                            address: devData.address || '',
                            opAddress: devData.opAddress || '',
                            commonPhone: devData.commonPhone,
                            manager: 'Общий телефон',
                            managerPhone: '',
                            role: 'менеджер',
                            category: devData.category || 'newbuild'
                        });
                    }
                    
                    // Записи с менеджерами
                    const complexContacts = (db.contacts || []).filter(c => 
                        c.developer === developer && c.complex === complex
                    );
                    
                    for (const contact of complexContacts) {
                        this.records.push({
                            id: generateId(),
                            developer: developer,
                            complex: complex,
                            address: devData.address || '',
                            opAddress: devData.opAddress || '',
                            commonPhone: devData.commonPhone || '',
                            manager: contact.name,
                            managerPhone: contact.phone,
                            role: contact.role,
                            category: devData.category || 'newbuild'
                        });
                    }
                }
            }
            
            // Если записей нет, загружаем демо
            if (this.records.length === 0) {
                this.loadDemoData();
            }
            
            this.updateDevelopersSet();
            console.log(`📀 Загружено ${this.records.length} записей из localStorage`);
            return true;
        } catch (e) {
            console.error('Ошибка загрузки из localStorage:', e);
            return false;
        }
    }

    /**
     * Загрузка демонстрационных данных
     */
    loadDemoData() {
        this.records = [
            { id: generateId(), developer: "Расцветай", complex: "Эко-квартал на Кедровой", address: "ул. Кедровая 80/1а", opAddress: "", commonPhone: "+7 (383) 255-88-22", manager: "Данил Швец", managerPhone: "+7 961 873-63-10", role: "менеджер", category: "newbuild" },
            { id: generateId(), developer: "Расцветай", complex: "Эко-квартал на Кедровой", address: "ул. Кедровая 80/1а", opAddress: "", commonPhone: "+7 (383) 255-88-22", manager: "Александра Гаммель", managerPhone: "+7 961 848-39-56", role: "менеджер", category: "newbuild" },
            { id: generateId(), developer: "Расцветай", complex: "Расцветай на Красном", address: "ул. Красный проспект 165", opAddress: "", commonPhone: "", manager: "Денис Бородин", managerPhone: "+7 960 792-82-68", role: "менеджер", category: "newbuild" },
            { id: generateId(), developer: "VIRA (Вира)", complex: "CITATUM (Цитатум)", address: "", opAddress: "ул.Фрунзе 63", commonPhone: "+7 (383) 271-22-22", manager: "Екатерина Рольгайзер", managerPhone: "+7 913 723-00-37", role: "специалист по работе с партнерами", category: "newbuild" }
        ];
        this.updateDevelopersSet();
        this.saveToLocalStorage();
        console.log('📦 Загружены демо-данные');
    }

    /**
     * Обновление списка уникальных застройщиков
     */
    updateDevelopersSet() {
        this.developersSet.clear();
        for (const record of this.records) {
            if (record.developer) {
                this.developersSet.add(record.developer);
            }
        }
    }

    /**
     * Сохранение данных в localStorage (в формате для каталога)
     */
    saveToLocalStorage() {
        const developers = {};
        const contacts = [];
        
        for (const record of this.records) {
            const devName = record.developer;
            const complexName = record.complex;
            
            if (!devName || !complexName) continue;
            
            // Создаем застройщика если нет
            if (!developers[devName]) {
                developers[devName] = {
                    id: 'dev_' + generateId(),
                    complexes: [],
                    address: record.address || '',
                    opAddress: record.opAddress || '',
                    commonPhone: record.commonPhone || '',
                    category: record.category || 'newbuild'
                };
            }
            
            const devData = developers[devName];
            
            // Добавляем ЖК если нет
            if (!devData.complexes.includes(complexName)) {
                devData.complexes.push(complexName);
            }
            
            // Обновляем адреса и телефоны
            if (record.address && !devData.address) devData.address = record.address;
            if (record.opAddress && !devData.opAddress) devData.opAddress = record.opAddress;
            if (record.commonPhone && !devData.commonPhone) devData.commonPhone = record.commonPhone;
            
            // Добавляем контакт (если это не общий телефон)
            if (record.manager && record.manager !== 'Общий телефон' && record.managerPhone) {
                contacts.push({
                    developer: devName,
                    complex: complexName,
                    name: record.manager,
                    phone: record.managerPhone,
                    role: record.role || 'менеджер'
                });
            }
        }
        
        const database = { developers, contacts };
        localStorage.setItem('contactsDatabase', JSON.stringify(database));
        localStorage.setItem('lastDataUpdate', new Date().toISOString());
        console.log('💾 Данные сохранены в localStorage');
    }

    /**
     * Применение фильтров
     */
    applyFilters() {
        let filtered = [...this.records];
        
        // Поиск по всем полям
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(record => {
                return Object.values(record).some(value => 
                    String(value).toLowerCase().includes(query)
                );
            });
        }
        
        // Фильтр по застройщику
        if (this.filterDeveloper) {
            filtered = filtered.filter(record => 
                record.developer === this.filterDeveloper
            );
        }
        
        // Фильтр по категории
        if (this.filterCategory) {
            filtered = filtered.filter(record => 
                record.category === this.filterCategory
            );
        }
        
        this.filteredRecords = filtered;
        this.currentPage = 1;
        return this.filteredRecords;
    }

    /**
     * Получение записей для текущей страницы
     */
    getCurrentPageRecords() {
        const start = (this.currentPage - 1) * this.perPage;
        const end = start + this.perPage;
        return this.filteredRecords.slice(start, end);
    }

    /**
     * Получение общего количества страниц
     */
    getTotalPages() {
        return Math.ceil(this.filteredRecords.length / this.perPage);
    }

    /**
     * Получение статистики
     */
    getStats() {
        const uniqueDevelopers = new Set(this.records.map(r => r.developer).filter(Boolean));
        const uniqueComplexes = new Set(this.records.map(r => `${r.developer}|${r.complex}`).filter(Boolean));
        const managersCount = this.records.filter(r => r.manager && r.manager !== 'Общий телефон').length;
        
        return {
            total: this.records.length,
            developers: uniqueDevelopers.size,
            complexes: uniqueComplexes.size,
            managers: managersCount
        };
    }

    /**
     * Добавление новой записи
     */
    addRecord(recordData) {
        const newRecord = {
            id: generateId(),
            developer: cleanName(recordData.developer),
            complex: cleanName(recordData.complex),
            address: recordData.address || '',
            opAddress: recordData.opAddress || '',
            commonPhone: formatPhone(recordData.commonPhone),
            manager: recordData.manager || '',
            managerPhone: formatPhone(recordData.managerPhone),
            role: recordData.role || 'менеджер',
            category: recordData.category || 'newbuild'
        };
        
        this.records.push(newRecord);
        this.updateDevelopersSet();
        this.saveToLocalStorage();
        this.applyFilters();
        return newRecord;
    }

    /**
     * Обновление существующей записи
     */
    updateRecord(id, updatedData) {
        const index = this.records.findIndex(r => r.id === id);
        if (index === -1) return false;
        
        this.records[index] = {
            ...this.records[index],
            developer: cleanName(updatedData.developer),
            complex: cleanName(updatedData.complex),
            address: updatedData.address || '',
            opAddress: updatedData.opAddress || '',
            commonPhone: formatPhone(updatedData.commonPhone),
            manager: updatedData.manager || '',
            managerPhone: formatPhone(updatedData.managerPhone),
            role: updatedData.role || 'менеджер',
            category: updatedData.category || 'newbuild'
        };
        
        this.updateDevelopersSet();
        this.saveToLocalStorage();
        this.applyFilters();
        return true;
    }

    /**
     * Удаление записи
     */
    deleteRecord(id) {
        const index = this.records.findIndex(r => r.id === id);
        if (index === -1) return false;
        
        this.records.splice(index, 1);
        this.updateDevelopersSet();
        this.saveToLocalStorage();
        this.applyFilters();
        return true;
    }

    /**
     * Получение записи по ID
     */
    getRecordById(id) {
        return this.records.find(r => r.id === id);
    }

    /**
     * Импорт из CSV
     */
    importFromCSV(csvText) {
        const lines = csvText.split('\n');
        if (lines.length === 0) return { imported: 0, errors: 0 };
        
        const newRecords = [];
        let importedCount = 0;
        let errorCount = 0;
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Парсинг CSV с учетом кавычек
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
            
            // Извлекаем значения
            let developer = row[0]?.replace(/^"|"$/g, '')?.trim();
            const complex = row[1]?.replace(/^"|"$/g, '')?.trim();
            const address = row[2]?.replace(/^"|"$/g, '')?.trim() || '';
            const opAddress = row[3]?.replace(/^"|"$/g, '')?.trim() || '';
            const commonPhone = row[4]?.replace(/^"|"$/g, '')?.trim() || '';
            const manager = row[5]?.replace(/^"|"$/g, '')?.trim();
            const managerPhone = row[6]?.replace(/^"|"$/g, '')?.trim();
            const role = row[7]?.replace(/^"|"$/g, '')?.trim() || 'менеджер';
            const category = row[8]?.replace(/^"|"$/g, '')?.trim() || 'newbuild';
            
            // Пропускаем строки без застройщика или ЖК
            if (!developer || !complex) {
                errorCount++;
                continue;
            }
            
            // Очищаем названия
            developer = cleanName(developer);
            const cleanComplex = cleanName(complex);
            
            newRecords.push({
                id: generateId(),
                developer: developer,
                complex: cleanComplex,
                address: address,
                opAddress: opAddress,
                commonPhone: commonPhone,
                manager: manager || '',
                managerPhone: managerPhone || '',
                role: role,
                category: category
            });
            importedCount++;
        }
        
        if (newRecords.length > 0) {
            this.records = newRecords;
            this.updateDevelopersSet();
            this.saveToLocalStorage();
            this.applyFilters();
        }
        
        return { imported: importedCount, errors: errorCount };
    }

    /**
     * Экспорт в CSV
     */
    exportToCSV() {
        const headers = ['Застройщик', 'Название ЖК', 'Адрес ЖК', 'Адрес ОП', 'Общий телефон', 'Менеджер', 'Телефон менеджера', 'Должность', 'Категория'];
        const rows = [headers];
        
        for (const record of this.records) {
            rows.push([
                `"${record.developer || ''}"`,
                `"${record.complex || ''}"`,
                `"${record.address || ''}"`,
                `"${record.opAddress || ''}"`,
                `"${record.commonPhone || ''}"`,
                `"${record.manager || ''}"`,
                `"${record.managerPhone || ''}"`,
                `"${record.role || 'менеджер'}"`,
                `"${record.category || 'newbuild'}"`
            ]);
        }
        
        return rows.map(row => row.join(',')).join('\n');
    }

    /**
     * Экспорт в массив объектов для Excel
     */
    exportToExcelData() {
        return this.records.map(record => ({
            'Застройщик': record.developer,
            'Название ЖК': record.complex,
            'Адрес ЖК': record.address,
            'Адрес ОП': record.opAddress,
            'Общий телефон': record.commonPhone,
            'Менеджер': record.manager,
            'Телефон менеджера': record.managerPhone,
            'Должность': record.role,
            'Категория': record.category === 'suburban' ? 'Загородная' : 'Новостройка'
        }));
    }

    /**
     * Получение списка уникальных застройщиков (для фильтра)
     */
    getDevelopersList() {
        return Array.from(this.developersSet).sort();
    }
}
