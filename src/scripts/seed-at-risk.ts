import { AppDataSource } from '../shared/infrastructure/database/postgres';

async function seedAtRisk() {
    await AppDataSource.initialize();
    
    const today = new Date();
    
    // Find an IN_USE asset and set its warranty to already expired
    const inUseAssets = await AppDataSource.query(
        `SELECT id FROM assets WHERE status = 'IN_USE' LIMIT 3`
    );
    
    if (inUseAssets.length === 0) {
        console.log('No hay activos IN_USE. Buscando AVAILABLE...');
        const available = await AppDataSource.query(
            `SELECT id FROM assets WHERE status = 'AVAILABLE' LIMIT 1`
        );
        if (available.length === 0) { console.error('No hay activos'); process.exit(1); }
        // Force to IN_USE
        await AppDataSource.query(
            `UPDATE assets SET status = 'IN_USE' WHERE id = $1`, [available[0].id]
        );
        inUseAssets.push(available[0]);
    }
    
    // Set purchase_date = 3 years ago, warranty_months = 12 => expired 2 years ago
    const purchaseDate = new Date(today);
    purchaseDate.setFullYear(purchaseDate.getFullYear() - 3); // 3 years ago
    const purchaseDateStr = purchaseDate.toISOString().split('T')[0];
    
    await AppDataSource.query(
        `UPDATE assets 
         SET purchase_date = $1, warranty_months = 12, depreciation_years = NULL
         WHERE id = $2`,
        [purchaseDateStr, inUseAssets[0].id]
    );
    
    console.log(`✅ Activo ${inUseAssets[0].id} configurado como EN RIESGO:`);
    console.log(`   purchase_date = ${purchaseDateStr} (3 años atrás)`);
    console.log(`   warranty_months = 12 (garantía venció hace ~2 años)`);
    
    // Verify
    const verify = await AppDataSource.query(
        `SELECT id, status, purchase_date, warranty_months,
                (purchase_date + (warranty_months || ' months')::interval) as warranty_end,
                CURRENT_DATE as hoy,
                CASE WHEN (purchase_date + (warranty_months || ' months')::interval) < CURRENT_DATE 
                     THEN 'EN RIESGO' ELSE 'OK' END as riesgo
         FROM assets WHERE id = $1`,
        [inUseAssets[0].id]
    );
    console.log('\n=== Verificación ===');
    console.log(JSON.stringify(verify, null, 2));
    
    process.exit(0);
}

seedAtRisk().catch(e => { console.error(e.message); process.exit(1); });
