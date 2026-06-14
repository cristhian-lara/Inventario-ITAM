import { AppDataSource } from '../shared/infrastructure/database/postgres';

async function debugRisk() {
    await AppDataSource.initialize();
    
    // All IN_USE assets
    const inUse = await AppDataSource.query(
        `SELECT id, status, purchase_date, warranty_months, depreciation_years 
         FROM assets WHERE status = 'IN_USE'`
    );
    console.log('\n=== ACTIVOS IN_USE ===');
    console.log(JSON.stringify(inUse, null, 2));

    // At-risk query same as backend
    const atRisk = await AppDataSource.query(
        `SELECT id, status, purchase_date, warranty_months,
                (purchase_date + (warranty_months || ' months')::interval) as warranty_end,
                CURRENT_DATE as hoy
         FROM assets
         WHERE status = 'IN_USE'
           AND purchase_date IS NOT NULL
           AND (
             (warranty_months IS NOT NULL AND (purchase_date + (warranty_months || ' months')::interval) < CURRENT_DATE)
             OR
             (depreciation_years IS NOT NULL AND (purchase_date + (depreciation_years || ' years')::interval) < CURRENT_DATE)
           )`
    );
    console.log('\n=== EN RIESGO (backend SQL) ===');
    console.log(JSON.stringify(atRisk, null, 2));

    process.exit(0);
}

debugRisk().catch(e => { console.error(e.message); process.exit(1); });
