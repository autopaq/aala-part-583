const fs = require('fs');
const path = require('path');

function normalizeHeaderName(headerValue) {
    return headerValue
        .trim()
        .replace(/"/g, '')
        .toLowerCase()
        .replace(/\s+/g, '_');
}

function parseCSV(content) {
    const lines = content.trim().split('\n');
    const header = lines[0].split(',').map(normalizeHeaderName);
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
            header.forEach((headerName, idx) => {
                row[headerName] = values[idx];
            });
            rows.push(row);
        }
    }
    return rows;
}

function parseCliArgs() {
    const args = process.argv.slice(2);
    let targetYear = null;
    let outputPath = './migrations/0005_import_coverage_final_assembly.sql';

    for (let idx = 0; idx < args.length; idx++) {
        const argValue = args[idx];
        if (argValue === '--year' && args[idx + 1]) {
            targetYear = parseInt(args[idx + 1], 10);
            idx += 1;
            continue;
        }
        if (argValue === '--output' && args[idx + 1]) {
            outputPath = args[idx + 1];
            idx += 1;
            continue;
        }
    }

    return { targetYear, outputPath };
}

function toSqlText(valueText) {
    if (!valueText) {
        return 'NULL';
    }
    return `'${valueText.replace(/'/g, "''")}'`;
}

function toSqlInteger(valueText) {
    if (!valueText) {
        return 'NULL';
    }

    const parsedValue = parseInt(valueText.replace('%', ''), 10);
    if (Number.isNaN(parsedValue)) {
        return 'NULL';
    }
    return parsedValue;
}

function generateMigration(targetYear) {
    const dataDir = './data';
    const files = fs
        .readdirSync(dataDir)
        .filter(fileName => fileName.endsWith('.csv'))
        .sort()
        .filter(fileName => {
            if (!targetYear) {
                return true;
            }
            const fileYear = parseInt(fileName.match(/alaa_(\d{4})\.csv/)[1], 10);
            return fileYear === targetYear;
        });

    if (targetYear && files.length === 0) {
        throw new Error(`No CSV file found for year ${targetYear}`);
    }
    
    let sql = `-- Generated at ${new Date().toISOString()}
CREATE TABLE IF NOT EXISTS coverage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    manufacturer TEXT,
    make TEXT,
    model TEXT,
    vehicle_type TEXT,
    percent_content INTEGER,
    final_assembly_country TEXT
);
`;

    for (const file of files) {
        const year = parseInt(file.match(/alaa_(\d{4})\.csv/)[1], 10);
        const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
        const rows = parseCSV(content);
        
        sql += `-- Delete existing data for year ${year}\n`;
        sql += `DELETE FROM coverage WHERE year = ${year};\n\n`;
        sql += `-- Insert data for year ${year}\n`;
        
        for (const row of rows) {
            const manufacturer = toSqlText(row.manufacturer);
            const make = toSqlText(row.make);
            const model = toSqlText(row.model);
            const vehicleType = toSqlText(row.vehicle_type);
            const percentContent = toSqlInteger(row.percent_content);
            const finalAssemblyCountry = toSqlText(row.final_assembly_country);
            const sourceYear = toSqlInteger(row.year);
            const recordYear = sourceYear === 'NULL' ? year : sourceYear;
            
            sql += `INSERT INTO coverage (year, manufacturer, make, model, vehicle_type, percent_content, final_assembly_country) VALUES (${recordYear}, ${manufacturer}, ${make}, ${model}, ${vehicleType}, ${percentContent}, ${finalAssemblyCountry});\n`;
        }
        sql += '\n';
    }
    
    return sql;
}

const { targetYear, outputPath } = parseCliArgs();
const migrationSQL = generateMigration(targetYear);
fs.writeFileSync(outputPath, migrationSQL);
console.log(`Generated ${outputPath}`);
if (targetYear) {
    console.log(`Migration includes only year ${targetYear}`);
}
console.log(`Run: npx wrangler d1 execute DB --remote --file ${outputPath}`);
