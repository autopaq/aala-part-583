# Motor Vehicle Logistics - AALA Part 583 Coverage Data

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/d1-template)

![Worker + D1 Template Preview](https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/cb7cb0a9-6102-4822-633c-b76b7bb25900/public)

## Overview

This project tracks American Automobile Labeling Act (AALA) Part 583 coverage data for motor vehicles. It uses Cloudflare Workers with D1 database to store and serve vehicle manufacturer content percentage data from 2020-2025.

The database contains:
- **comments** table: Sample data for testing D1 functionality
- **coverage** table: AALA Part 583 vehicle content percentage data by year

## Data Import

The `data/` directory contains CSV files with vehicle coverage data:
- `alaa_2020.csv` through `alaa_2025.csv`
- Each file contains: manufacturer, make, model, vehicle_type, percent_content

### Importing Coverage Data

Use the included `import-coverage.js` script to convert CSV files into D1 migrations:

```bash
# Generate migration from CSV files
node import-coverage.js

# Apply migration to remote D1 database
npx wrangler d1 migrations apply DB --remote

# Verify data import
npx wrangler d1 execute DB --remote --command "SELECT COUNT(*), year FROM coverage GROUP BY year ORDER BY year"
```

The script automatically:
- Creates a `coverage` table with proper schema
- Extracts year from filename (e.g., `alaa_2020.csv` → year 2020)
- Handles CSV parsing with quoted commas
- Converts percentage strings to integers
- Creates idempotent migrations (safe to re-run)

## Setup Steps

1. Install the project dependencies:
   ```bash
   npm install
   ```

2. The D1 database is already configured in `wrangler.json` with database ID `6ce49ada-f38f-48f6-924f-69b2755f2547`.

3. Run database migrations to initialize tables:
   ```bash
   npx wrangler d1 migrations apply DB --remote
   ```

4. Import coverage data from CSV files:
   ```bash
   node import-coverage.js
   npx wrangler d1 migrations apply DB --remote
   ```

5. Deploy the project:
   ```bash
   npx wrangler deploy
   ```

## Database Schema

### Coverage Table
```sql
CREATE TABLE coverage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    manufacturer TEXT,
    make TEXT,
    model TEXT,
    vehicle_type TEXT,
    percent_content INTEGER
);
```

## Development

```bash
# Start local development
npm run dev

# Check TypeScript and dry-run deployment
npm run check

# Deploy to production
npm run deploy
```
