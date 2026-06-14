import { AppDataSource } from '../shared/infrastructure/database/postgres';

async function fixDepreciation() {
    await AppDataSource.initialize();
    
    // Fix: set depreciation_years = NULL where it's 0 or negative (invalid data)
    const result = await AppDataSource.query(
        `UPDATE assets SET depreciation_years = NULL WHERE depreciation_years IS NOT NULL AND depreciation_years <= 0`
    );
    console.log('Activos corregidos:', result);
    
    process.exit(0);
}

fixDepreciation().catch(e => { console.error(e.message); process.exit(1); });
