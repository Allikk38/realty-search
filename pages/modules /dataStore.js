/**
 * Модуль управления данными
 * Версия: 1.0
 */

import { formatPhone, cleanName, generateId, showToast } from './uiHelpers.js';

export class DataStore {
    constructor() {
        this.records = [];
        this.developersSet = new Set();
        this.filteredRecords = [];
        this.currentPage = 1;
        this.perPage = 20;
        this.searchQuery = '';
        this.filterDeveloper = '';
        this.filterCategory = '';
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('contactsDatabase');
            if (!saved) {
                console.log('Нет данных в localStorage');
                return false;
            }
            
            const db = JSON.parse(saved);
            this.records = [];
            
            for (const [developer, devData] of Object.entries(db.developers || {})) {
                for (const complex of devData.complexes || []) {
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
            
            if (this.records.length === 0) {
                this.loadDemoData();
            }
            
            this.updateDevelopersSet();
            console.log(`📀 Загружено ${this.records.length} записей`);
            return true;
        } catch (e) {
            console.error('Ошибка загрузки:', e);
            return false;
        }
    }

    loadDemoData() {
        this.records = [
            { id: generateId(), developer: "Расцветай", complex: "Эко-квартал на Кедровой", address: "ул. Кедровая 80/1а", opAddress: "", commonPhone: "+7 (383) 255-88-22", manager: "Данил Швец", managerPhone: "+7 961 873-63-10", role: "менеджер", category: "newbuild" },
            { id: generateId(), developer: "Расцветай", complex: "Эко-квартал на Кедровой", address: "ул. Кедровая 80/1а", opAddress: "", commonPhone: "+7 (383) 255-88-22", manager: "Александра Гаммель", managerPhone: "+7 961 848-39-56", role: "менеджер", category: "newbuild" },
            { id: generateId(), developer: "VIRA (Вира)", complex: "CITATUM (Цитатум)", address: "", opAddress: "ул.Фрунзе 63", commonPhone: "+7 (383) 271-22-22", manager: "Екатерина Рольгайзер", managerPhone: "+7 913 723-00-37", role: "специалист по работе с партнерами", category: "newbuild" }
        ];
        this.updateDevelopersSet();
        this.saveToLocalStorage();
    }

    updateDevelopersSet() {
        this.developersSet.clear();
        for (const record of this.records) {
            if (record.developer) this.developersSet.add(record.developer);
        }
    }

    saveToLocalStorage() {
        const developers = {};
        const contacts = [];
        
        for (const record of this.records) {
            const devName = record.developer;
            const complexName = record.complex;
            
            if (!devName || !complexName) continue;
            
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
            
            if (!devData.complexes.includes(complexName)) {
                devData.complexes.push(complexName);
            }
            
            if (record.address && !devData.address) devData.address = record.address;
            if (record.opAddress && !devData.opAddress) devData.opAddress = record.opAddress;
            if (record.commonPhone && !devData.commonPhone) devData.commonPhone = record.commonPhone;
            
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
        
        localStorage.setItem('contactsDatabase', JSON.stringify({ developers, contacts }));
        console.log('💾 Данные сохранены');
    }

    applyFilters() {
        let filtered = [...this.records];
        
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(record => {
                return Object.values(record).some(value => 
                    String(value).toLowerCase().includes(query)
                );
            });
        }
        
        if (this.filterDeveloper) {
            filtered = filtered.filter(record => record.developer === this.filterDeveloper);
        }
        
        if (this.filterCategory) {
            filtered = filtered.filter(record => record.category === this.filterCategory);
        }
        
        this.filteredRecords = filtered;
        this.currentPage = 1;
        return this.filteredRecords;
    }

    getCurrentPageRecords() {
        const start = (this.currentPage - 1) * this.perPage;
        return this.filteredRecords.slice(start, start + this.perPage);
    }

    getTotalPages() {
        return Math.ceil(this.filteredRecords.length / this.perPage);
    }

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

    deleteRecord(id) {
        const index = this.records.findIndex(r => r.id === id);
        if (index === -1) return false;
        
        this.records.splice(index, 1);
        this.updateDevelopersSet();
        this.saveToLocalStorage();
        this.applyFilters();
        return true;
    }

    getRecordById(id) {
        return this.records.find(r => r.id === id);
    }

    getDevelopersList() {
        return Array.from(this.developersSet).sort();
    }

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

    importFromCSV(csvText) {
        const lines = csvText.split('\n');
        if (lines.length === 0) return { imported: 0, errors: 0 };
        
        const newRecords = [];
        let importedCount = 0;
        let errorCount = 0;
        
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
            
            if (!developer || !complex) {
                errorCount++;
                continue;
            }
            
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
}
