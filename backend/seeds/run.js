const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool, query } = require('../src/config/db');

async function seed() {
    console.log("Seeding database...\n");
    
    try {
        // Load JSON data from database folder
        const marketsPath = path.join(__dirname, '../../database/seed_data/NCR_markets.json');
        const commoditiesPath = path.join(__dirname, '../../database/seed_data/commodity_taxonomy.json');
        
        const marketsData = JSON.parse(fs.readFileSync(marketsPath, 'utf-8'));
        const commoditiesData = JSON.parse(fs.readFileSync(commoditiesPath, 'utf-8'));

        // Clear existing tables
        await query('TRUNCATE TABLE historical_prices, submission_items, submissions, users, commodities, markets, forecast_validations, forecasts, audit_logs, commodity_name_map CASCADE;');

        // 1. Insert Markets
        for (const m of marketsData) {
            await query(`
                INSERT INTO markets (market_name, market_code, city, latitude, longitude, address, geom)
                VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($7, $8), 4326))
            `, [m.market_name, m.market_code, m.city, m.latitude, m.longitude, m.address, m.longitude, m.latitude]);
        }
        console.log(`  Markets: ${marketsData.length}`);

        // 2. Insert Commodities
        for (const c of commoditiesData) {
            await query(`
                INSERT INTO commodities (commodity_name, canonical_name, category, unit_of_measure, is_imported, is_forecastable)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [c.commodity_name, c.canonical_name, c.category, c.unit_of_measure, c.is_imported, c.is_forecastable]);
        }
        console.log(`  Commodities: ${commoditiesData.length}`);

        // 3. Insert Test Users
        const salt = await bcrypt.genSalt(12);
        
        const adminPass = await bcrypt.hash('Admin@2025', salt);
        await query(`INSERT INTO users (employee_id, first_name, last_name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6)`, 
            ['DA-ADMIN-001', 'System', 'Admin', 'admin@agrimaps.da.gov.ph', adminPass, 'admin']);
        console.log(`  Admin user: DA-ADMIN-001 / Admin@2025`);

        const fieldPass = await bcrypt.hash('Field@2025', salt);
        await query(`INSERT INTO users (employee_id, first_name, last_name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6)`, 
            ['DA-FIELD-001', 'Field', 'Worker', 'field@agrimaps.da.gov.ph', fieldPass, 'da_field']);
        console.log(`  Field user: DA-FIELD-001 / Field@2025`);

        const monPass = await bcrypt.hash('Monitor@2025', salt);
        await query(`INSERT INTO users (employee_id, first_name, last_name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6)`, 
            ['DA-MON-001', 'Monitor', 'Staff', 'monitor@agrimaps.da.gov.ph', monPass, 'da_monitoring']);
        console.log(`  Monitor user: DA-MON-001 / Monitor@2025`);

        // 4. Generate 520 Historical Price Records
        const { rows: marketRows } = await query('SELECT id FROM markets LIMIT 10;');
        const { rows: commRows } = await query('SELECT id FROM commodities LIMIT 10;');

        const priceRecords = 520;
        let inserted = 0;
        let currentDate = new Date('2024-01-01');
        
        for (let i = 0; i < priceRecords; i++) {
            const marketId = marketRows[i % marketRows.length].id;
            const commId = commRows[i % commRows.length].id;
            
            const startStr = currentDate.toISOString().split('T')[0];
            const end = new Date(currentDate);
            end.setDate(end.getDate() + 6);
            const endStr = end.toISOString().split('T')[0];
            
            const weekNum = Math.floor(i / 10) + 1;
            const year = currentDate.getFullYear();
            
            // Random dummy price between 50 and 200
            const price = (Math.random() * 150 + 50).toFixed(2);

            try {
                await query(`
                    INSERT INTO historical_prices (commodity_id, market_id, week_start_date, week_end_date, week_number, year, retail_price)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [commId, marketId, startStr, endStr, weekNum, year, price]);
                inserted++;
            } catch (e) {
                // Ignore constraint violations during mock generation
            }
            
            // Move forward by 7 days after seeding 10 records (simulating weekly data)
            if (i % 10 === 9) {
                currentDate.setDate(currentDate.getDate() + 7);
            }
        }
        
        console.log(`  Price records: ${inserted}\n`);
        console.log("Done!");
    } catch (err) {
        console.error("Error seeding database:", err);
    } finally {
        await pool.end();
    }
}

seed();
