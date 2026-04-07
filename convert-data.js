// convert-data.js - скрипт для преобразования сырых данных в формат для сайта
const fs = require('fs');

// Функция форматирования телефона
function formatPhone(phone) {
    if (!phone || phone === 'Общий телефон' || phone === 'Телефон ОП') return '';
    
    let cleaned = String(phone).replace(/[^\d+]/g, '');
    
    // Убираем лишние символы
    if (cleaned.startsWith('8') && cleaned.length === 11) {
        cleaned = '+7' + cleaned.slice(1);
    }
    if (cleaned.startsWith('7') && cleaned.length === 11 && !cleaned.startsWith('+')) {
        cleaned = '+' + cleaned;
    }
    if (cleaned.length === 10 && !cleaned.startsWith('+')) {
        cleaned = '+7' + cleaned;
    }
    
    return cleaned;
}

// Функция очистки названия застройщика
function cleanDeveloper(dev) {
    if (!dev) return '';
    return dev
        .replace(/Сайт/g, '')
        .replace(/ТГ-канал/g, '')
        .replace(/Realt.one/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

// Основная функция конвертации
function convertCSV(inputFile, outputFile) {
    const content = fs.readFileSync(inputFile, 'utf-8');
    const lines = content.split('\n');
    
    // Парсим заголовки
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    
    const developers = new Map(); // для группировки
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Простой парсинг CSV (учитывая кавычки)
        const row = [];
        let inQuotes = false;
        let current = '';
        
        for (let char of line) {
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
        
        const record = {};
        for (let j = 0; j < headers.length; j++) {
            record[headers[j]] = row[j] ? row[j].replace(/^"|"$/g, '') : '';
        }
        
        const developer = cleanDeveloper(record['Застройщик'] || '');
        const complex = record['Название ЖК'] || '';
        const address = record['Адрес ЖК'] || '';
        const opAddress = record['Адрес ОП'] || '';
        const commonPhone = formatPhone(record['Телефон'] || '');
        const manager = record['Менеджер'] || '';
        const managerPhone = formatPhone(record['Телефон'] || '');
        const role = record['Должность/Тип'] || 'менеджер';
        
        if (!developer || !complex) continue;
        
        if (!developers.has(developer)) {
            developers.set(developer, {
                complexes: new Set(),
                address: address,
                opAddress: opAddress,
                commonPhone: commonPhone,
                contacts: []
            });
        }
        
        const devData = developers.get(developer);
        devData.complexes.add(complex);
        
        // Сохраняем контакт, если это не общий телефон
        if (manager && manager !== 'Общий телефон' && manager !== 'Телефон ОП') {
            devData.contacts.push({
                complex: complex,
                name: manager,
                phone: managerPhone,
                role: role
            });
        }
        
        // Обновляем общий телефон, если нашли
        if (commonPhone && commonPhone !== devData.commonPhone) {
            devData.commonPhone = commonPhone;
        }
        if (address) devData.address = address;
        if (opAddress) devData.opAddress = opAddress;
    }
    
    // Формируем выходной CSV
    const outputLines = ['Застройщик,Название ЖК,Адрес ЖК,Адрес ОП,Общий телефон,Менеджер,Телефон менеджера,Должность,Категория'];
    
    for (let [developer, data] of developers) {
        const complexes = Array.from(data.complexes);
        
        for (let complex of complexes) {
            // Добавляем общий телефон как отдельную запись
            if (data.commonPhone) {
                outputLines.push(`"${developer}","${complex}","${data.address || ''}","${data.opAddress || ''}","${data.commonPhone}",Общий телефон,,менеджер,newbuild`);
            }
            
            // Добавляем контакты
            const complexContacts = data.contacts.filter(c => c.complex === complex);
            for (let contact of complexContacts) {
                outputLines.push(`"${developer}","${complex}","${data.address || ''}","${data.opAddress || ''}","${data.commonPhone || ''}","${contact.name}","${contact.phone}","${contact.role}",newbuild`);
            }
        }
    }
    
    fs.writeFileSync(outputFile, outputLines.join('\n'), 'utf-8');
    console.log(`✅ Конвертация завершена! Сохранено ${outputLines.length - 1} записей в ${outputFile}`);
}

// Запуск (если запускаете через Node.js)
// convertCSV('source.csv', 'data.csv');
