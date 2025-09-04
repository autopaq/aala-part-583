const fs = require('fs');
const path = require('path');

function parseCSV(content) {
    const lines = content.trim().split('\n');
    const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim().replace(/"/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim().replace(/"/g, ''));
        
        if (values.length === header.length) {
            const row = {};
            header.forEach((h, idx) => {
                row[h.trim()] = values[idx];
            });
            rows.push(row);
        }
    }
    return rows;
}

function generateMigration() {
    const dataDir = './data';
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'));
    
    let sql = `-- Migration number: 0003\t${new Date().toISOString()}
CREATE TABLE IF NOT EXISTS coverage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    manufacturer TEXT,
    make TEXT,
    model TEXT,
    vehicle_type TEXT,
    percent_content INTEGER
);

`;

    for (const file of files) {
        const year = parseInt(file.match(/alaa_(\d{4})\.csv/)[1]);
        const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
        const rows = parseCSV(content);
        
        sql += `-- Delete existing data for year ${year}\n`;
        sql += `DELETE FROM coverage WHERE year = ${year};\n\n`;
        sql += `-- Insert data for year ${year}\n`;
        
        for (const row of rows) {
            const manufacturer = row.manufacturer ? `'${row.manufacturer.replace(/'/g, "''")}'` : 'NULL';
            const make = row.make ? `'${row.make.replace(/'/g, "''")}'` : 'NULL';
            const model = row.model ? `'${row.model.replace(/'/g, "''")}'` : 'NULL';
            const vehicleType = row.vehicle_type ? `'${row.vehicle_type.replace(/'/g, "''")}'` : 'NULL';
            const percentContent = row.percent_content ? parseInt(row.percent_content.replace('%', '')) : 'NULL';
            
            sql += `INSERT INTO coverage (year, manufacturer, make, model, vehicle_type, percent_content) VALUES (${year}, ${manufacturer}, ${make}, ${model}, ${vehicleType}, ${percentContent});\n`;
        }
        sql += '\n';
    }
    
    return sql;
}

const migrationSQL = generateMigration();
fs.writeFileSync('./migrations/0003_import_coverage_fixed.sql', migrationSQL);
console.log('Generated migrations/0003_import_coverage_fixed.sql');
console.log('Run: npx wrangler d1 migrations apply DB --remote');