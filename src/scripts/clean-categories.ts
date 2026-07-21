/**
 * Limpieza de categorías: conserva únicamente "Computadores" y borra las demás.
 * Pensado para dejar el ambiente local con una sola categoría antes del cargue real.
 *
 * Salvaguardas:
 *  - Se niega a correr si NODE_ENV === 'production'.
 *  - Requiere --force para borrar (sin ella, solo muestra qué haría).
 *  - Aborta si existen activos que referencien alguna categoría a borrar
 *    (la FK activos -> categorías lo impediría de todas formas).
 *
 * Uso:
 *   Vista previa:  npx ts-node src/scripts/clean-categories.ts
 *   Ejecutar:      npx ts-node src/scripts/clean-categories.ts --force
 */
import { AppDataSource } from '../shared/infrastructure/database/postgres';

const KEEP_NAME = 'Computadores';

async function main() {
    const force = process.argv.includes('--force');

    if (process.env.NODE_ENV === 'production') {
        console.error('❌ Abortado: NODE_ENV=production. Este script es solo para ambientes locales/controlados.');
        process.exit(1);
    }

    await AppDataSource.initialize();
    console.log('✅ Base de datos conectada.');

    const categories = await AppDataSource.query(
        'SELECT id, name FROM categories ORDER BY id'
    ) as Array<{ id: number; name: string }>;

    const toKeep = categories.filter(c => c.name.trim().toLowerCase() === KEEP_NAME.toLowerCase());
    const toDelete = categories.filter(c => c.name.trim().toLowerCase() !== KEEP_NAME.toLowerCase());

    console.log(`\n📊 Categorías actuales: ${categories.length}`);
    console.log('   Conservar:');
    toKeep.forEach(c => console.log(`     ✔ [${c.id}] ${c.name}`));
    if (toKeep.length === 0) console.log(`     ⚠ No se encontró ninguna categoría "${KEEP_NAME}".`);
    console.log('   Borrar:');
    toDelete.forEach(c => console.log(`     x [${c.id}] ${c.name}`));
    if (toDelete.length === 0) console.log('     (ninguna)');

    if (toDelete.length === 0) {
        console.log('\n✅ Nada que borrar.');
        await AppDataSource.destroy();
        return;
    }

    // Verificación de FK: no debe haber activos apuntando a categorías a borrar.
    const idsToDelete = toDelete.map(c => c.id);
    const [{ count: blockingAssets }] = await AppDataSource.query(
        `SELECT COUNT(*)::int AS count FROM assets WHERE category_id = ANY($1)`,
        [idsToDelete]
    ) as Array<{ count: number }>;

    if (blockingAssets > 0) {
        console.error(`\n❌ Abortado: hay ${blockingAssets} activo(s) que referencian categorías a borrar. Limpia o reasigna esos activos primero.`);
        await AppDataSource.destroy();
        process.exit(1);
    }

    if (!force) {
        console.log('\n⚠️  Vista previa: NO se borró nada.');
        console.log('   Para ejecutar el borrado real, corre de nuevo con --force:');
        console.log('   npx ts-node src/scripts/clean-categories.ts --force');
        await AppDataSource.destroy();
        return;
    }

    await AppDataSource.query(
        `DELETE FROM categories WHERE id = ANY($1)`,
        [idsToDelete]
    );
    console.log(`\n✅ ${toDelete.length} categoría(s) borrada(s). Se conservó "${KEEP_NAME}".`);

    await AppDataSource.destroy();
}

main().catch(async (err) => {
    console.error('❌ Error durante la limpieza de categorías:', err);
    try { await AppDataSource.destroy(); } catch { /* noop */ }
    process.exit(1);
});
