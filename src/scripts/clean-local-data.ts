/**
 * Limpieza de datos operativos (SIN reseed) para preparar un cargue masivo real
 * en un ambiente controlado (local).
 *
 * Borra únicamente: colaboradores, activos, mantenimientos y sus dependientes
 * (asignaciones, upgrades de hardware, historial de colaboradores).
 * PRESERVA: departments, cecos, categories, users.
 *
 * Salvaguardas:
 *  - Se niega a correr si NODE_ENV === 'production'.
 *  - Requiere la bandera --force para ejecutar realmente (sin ella, solo muestra
 *    cuántas filas se borrarían).
 *
 * Uso:
 *   Vista previa (no borra):  npx ts-node src/scripts/clean-local-data.ts
 *   Ejecutar de verdad:       npx ts-node src/scripts/clean-local-data.ts --force
 */
import { AppDataSource } from '../shared/infrastructure/database/postgres';

// Orden de borrado: hijos primero para respetar las dependencias.
const TABLES_IN_DELETE_ORDER = [
    'hardware_upgrades',
    'maintenances',
    'assignments',
    'collaborator_history',
    'assets',
    'collaborators',
];

async function main() {
    const force = process.argv.includes('--force');

    if (process.env.NODE_ENV === 'production') {
        console.error('❌ Abortado: NODE_ENV=production. Este script es solo para ambientes locales/controlados.');
        process.exit(1);
    }

    await AppDataSource.initialize();
    console.log('✅ Base de datos conectada.');

    // Conteo previo (para que veas exactamente qué se va a borrar).
    console.log('\n📊 Filas actuales en las tablas objetivo:');
    for (const table of TABLES_IN_DELETE_ORDER) {
        const rows = await AppDataSource.query(`SELECT COUNT(*)::int AS count FROM ${table}`) as Array<{ count: number }>;
        console.log(`   ${table.padEnd(22)} ${rows[0].count}`);
    }

    if (!force) {
        console.log('\n⚠️  Vista previa: NO se borró nada.');
        console.log('   Para ejecutar el borrado real, corre de nuevo con la bandera --force:');
        console.log('   npx ts-node src/scripts/clean-local-data.ts --force');
        await AppDataSource.destroy();
        return;
    }

    // Borrado atómico: si algo falla, no queda a medias.
    console.log('\n🧹 Borrando (colaboradores, activos, mantenimientos y dependientes)...');
    await AppDataSource.transaction(async (manager) => {
        for (const table of TABLES_IN_DELETE_ORDER) {
            await manager.query(`DELETE FROM ${table}`);
            console.log(`   ${table.padEnd(22)} borrada`);
        }
    });

    console.log('\n✅ Limpieza completada. Se preservaron departments, cecos, categories y users.');
    await AppDataSource.destroy();
}

main().catch(async (err) => {
    console.error('❌ Error durante la limpieza:', err);
    try { await AppDataSource.destroy(); } catch { /* noop */ }
    process.exit(1);
});
