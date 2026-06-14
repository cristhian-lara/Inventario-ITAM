import { AppDataSource } from '../shared/infrastructure/database/postgres';
import { MaintenanceOrmEntity } from '../modules/maintenance/infrastructure/orm/Maintenance.entity';
import { AssetOrmEntity } from '../modules/catalog/infrastructure/orm/Asset.entity';

async function seedKPIs() {
    console.log('🌱 Iniciando Seed de KPIs...');
    
    await AppDataSource.initialize();
    console.log('✅ Base de datos conectada.');

    const assetRepo = AppDataSource.getRepository(AssetOrmEntity);
    const maintRepo = AppDataSource.getRepository(MaintenanceOrmEntity);

    const assets = await assetRepo.find();
    if (assets.length === 0) {
        console.error('❌ No hay activos en la base de datos. Corre el seed original primero.');
        process.exit(1);
    }

    console.log(`📦 Se encontraron ${assets.length} activos. Generando data de garantías...`);

    const today = new Date();
    
    for (let i = 0; i < Math.min(15, assets.length); i++) {
        const asset = assets[i];
        let newWarrantyDate = new Date();
        
        if (i < 5) {
            newWarrantyDate.setDate(today.getDate() + Math.floor(Math.random() * 20) + 1);
        } else if (i < 10) {
            newWarrantyDate.setDate(today.getDate() - Math.floor(Math.random() * 60) - 1);
        } else {
            newWarrantyDate.setDate(today.getDate() + Math.floor(Math.random() * 300) + 90);
        }

        const attrs = typeof asset.dynamic_data === 'string' ? JSON.parse(asset.dynamic_data) : asset.dynamic_data || {};
        attrs.warrantyEnd = newWarrantyDate.toISOString().split('T')[0];
        
        asset.purchase_date = new Date(today.getTime() - 1000 * 60 * 60 * 24 * 365);
        const months = Math.round((newWarrantyDate.getTime() - asset.purchase_date.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        asset.warranty_months = Math.max(1, months);
        asset.dynamic_data = attrs;
        
        await assetRepo.save(asset);
    }

    console.log('🔧 Generando mantenimientos...');

    const statuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'];
    const types = ['PREVENTIVE', 'CORRECTIVE'];
    
    let maintCount = 0;

    for (let i = 0; i < 20; i++) {
        const asset = assets[Math.floor(Math.random() * assets.length)];
        
        let status = 'SCHEDULED';
        let type = types[Math.floor(Math.random() * types.length)];
        let scheduledDate = new Date();
        let executionDate = null;
        let notes = null;

        if (i < 5) {
            status = 'SCHEDULED';
            scheduledDate.setDate(today.getDate() - Math.floor(Math.random() * 15) - 1);
        } else if (i < 10) {
            status = 'SCHEDULED';
            scheduledDate.setDate(today.getDate() + Math.floor(Math.random() * 30) + 1);
        } else if (i < 15) {
            status = 'IN_PROGRESS';
            scheduledDate.setDate(today.getDate() - Math.floor(Math.random() * 10) - 2);
        } else {
            status = 'COMPLETED';
            scheduledDate.setDate(today.getDate() - Math.floor(Math.random() * 40) - 10);
            executionDate = new Date(scheduledDate);
            executionDate.setDate(executionDate.getDate() + Math.floor(Math.random() * 5));
            notes = 'Mantenimiento finalizado con éxito';
        }

        const newMaint = maintRepo.create({
            id: `maint-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            asset_id: asset.id,
            type: type,
            status: status,
            scheduled_date: scheduledDate,
            execution_date: executionDate || undefined,
            reason: type === 'CORRECTIVE' ? 'Falla reportada por usuario' : 'Mantenimiento anual',
            notes: notes || undefined,
            created_at: new Date(scheduledDate.getTime() - 1000 * 60 * 60 * 24 * 7)
        });

        await maintRepo.save(newMaint);
        maintCount++;
    }

    console.log(`✅ Seed de KPIs completado! Insertados ${maintCount} mantenimientos y actualizadas garantías.`);
    process.exit(0);
}

seedKPIs().catch(err => {
    console.error('Error en seed KPIs:', err);
    process.exit(1);
});
