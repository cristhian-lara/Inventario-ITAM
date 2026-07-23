/**
 * Comprobación de integridad referencial de los IDs de activos.
 *
 * assignments, maintenances y hardware_upgrades guardan asset_id como texto,
 * sin FK real: si un renombrado de ID no propaga bien, el historial queda
 * huérfano y en silencio. Este script lo detecta.
 *
 * Es de solo lectura: no modifica nada. Sale con código 1 si encuentra
 * huérfanos, para poder encadenarlo tras una migración.
 *
 * Uso:  npx ts-node src/scripts/verify-asset-id-integrity.ts
 */
import { AppDataSource } from '../shared/infrastructure/database/postgres';

async function main() {
    await AppDataSource.initialize();
    const q = (sql: string) => AppDataSource.query(sql);

    const orphans = await q(`
        SELECT 'assignments' AS tabla, COUNT(*)::int AS huerfanos FROM assignments a
          WHERE NOT EXISTS (SELECT 1 FROM assets s WHERE s.id = a.asset_id)
        UNION ALL
        SELECT 'maintenances', COUNT(*)::int FROM maintenances m
          WHERE NOT EXISTS (SELECT 1 FROM assets s WHERE s.id = m.asset_id)
        UNION ALL
        SELECT 'hardware_upgrades', COUNT(*)::int FROM hardware_upgrades h
          WHERE NOT EXISTS (SELECT 1 FROM assets s WHERE s.id = h.asset_id)
    `) as Array<{ tabla: string; huerfanos: number }>;

    console.log('\n🔗 Referencias a activos inexistentes:');
    orphans.forEach(o => console.log(`   ${o.huerfanos === 0 ? '✔' : '✘'} ${o.tabla}: ${o.huerfanos}`));

    const byCategory = await q(`
        SELECT c.name,
               c.attributes_schema->>'idPrefix' AS prefijo,
               COUNT(a.id)::int AS total,
               COUNT(a.id) FILTER (
                   WHERE c.attributes_schema->>'idPrefix' IS NOT NULL
                     AND a.id ~ ('^' || (c.attributes_schema->>'idPrefix') || '[0-9]+$')
               )::int AS con_prefijo
          FROM categories c LEFT JOIN assets a ON a.category_id = c.id
         GROUP BY c.id, c.name, c.attributes_schema ORDER BY c.name
    `) as Array<{ name: string; prefijo: string | null; total: number; con_prefijo: number }>;

    console.log('\n🏷  Activos por categoría:');
    byCategory.forEach(r => {
        const detail = r.prefijo
            ? `prefijo ${r.prefijo} → ${r.con_prefijo}/${r.total} con formato`
            : 'sin prefijo';
        console.log(`   ${r.name}: ${r.total} activo(s) (${detail})`);
    });

    const total = orphans.reduce((acc, o) => acc + o.huerfanos, 0);
    console.log(total === 0 ? '\n✅ Integridad correcta.' : `\n❌ ${total} referencia(s) huérfana(s).`);

    await AppDataSource.destroy();
    if (total > 0) process.exit(1);
}

main().catch(async (err) => {
    console.error('❌ Error:', err?.message || err);
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
    process.exit(1);
});
