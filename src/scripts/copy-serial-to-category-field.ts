/**
 * Copia el serial de la columna base al campo "Serial" definido en el esquema
 * de la categoría, para los activos SIN Placa Ikusi (Periféricos).
 *
 * Motivo: el formulario de esas categorías dejó de pedir los datos de compra,
 * incluida la columna base `serial`. En Periféricos el serial es un campo propio
 * de la categoría, así que el dato debe vivir en dynamic_data para poder verse
 * y editarse desde la interfaz.
 *
 * Es conservador:
 *  - Solo actúa sobre categorías con requiresPlacaIkusi = false que además
 *    definan un campo de tipo serial en su esquema.
 *  - Nunca pisa un valor ya presente en dynamic_data.
 *  - NO borra la columna base: queda como respaldo del dato original.
 *
 * Uso:
 *   Vista previa:  npx ts-node src/scripts/copy-serial-to-category-field.ts
 *   Ejecutar:      npx ts-node src/scripts/copy-serial-to-category-field.ts --force
 */
import { AppDataSource } from '../shared/infrastructure/database/postgres';

async function main() {
    const force = process.argv.includes('--force');

    await AppDataSource.initialize();
    console.log('✅ Base de datos conectada.');

    const categories = await AppDataSource.query(
        `SELECT id, name, attributes_schema FROM categories
          WHERE (attributes_schema->>'requiresPlacaIkusi') = 'false'
          ORDER BY name`
    ) as Array<{ id: number; name: string; attributes_schema: any }>;

    if (categories.length === 0) {
        console.log('\nNinguna categoría sin Placa Ikusi. Nada que hacer.');
        await AppDataSource.destroy();
        return;
    }

    let totalPendiente = 0;
    const plan: Array<{ id: number; name: string; field: string; pendientes: number }> = [];

    for (const cat of categories) {
        const fields: Array<{ name: string }> = cat.attributes_schema?.fields || [];
        const serialField = fields.find(f => f.name?.trim().toLowerCase() === 'serial');

        if (!serialField) {
            console.log(`\n⏭  "${cat.name}": su esquema no define un campo "Serial". Se omite.`);
            continue;
        }

        const rows = await AppDataSource.query(
            `SELECT COUNT(*)::int AS n FROM assets
              WHERE category_id = $1
                AND serial IS NOT NULL AND serial <> ''
                AND COALESCE(dynamic_data->>$2, '') = ''`,
            [cat.id, serialField.name]
        ) as Array<{ n: number }>;

        plan.push({ id: cat.id, name: cat.name, field: serialField.name, pendientes: rows[0].n });
        totalPendiente += rows[0].n;
    }

    console.log('\n📋 Plan de copia (columna base `serial` → campo de la categoría):');
    plan.forEach(p => console.log(`   [${p.id}] ${p.name} → campo "${p.field}": ${p.pendientes} activo(s) por copiar`));

    if (totalPendiente === 0) {
        console.log('\n✔ No hay nada pendiente de copiar.');
        await AppDataSource.destroy();
        return;
    }

    if (!force) {
        const muestra = await AppDataSource.query(
            `SELECT id, serial FROM assets
              WHERE category_id = $1 AND serial IS NOT NULL AND serial <> ''
              ORDER BY id LIMIT 5`,
            [plan[0].id]
        ) as Array<{ id: string; serial: string }>;
        console.log('\n   Muestra:');
        muestra.forEach(m => console.log(`     ${m.id}: "${m.serial}"  →  ${plan[0].field} = "${m.serial}"`));
        console.log('\n⚠ Vista previa. Nada se ha modificado. Vuelve a correr con --force para aplicar.');
        console.log('   La columna base `serial` se conserva intacta como respaldo.');
        await AppDataSource.destroy();
        return;
    }

    await AppDataSource.transaction(async (tx) => {
        for (const p of plan) {
            if (p.pendientes === 0) continue;
            await tx.query(
                `UPDATE assets
                    SET dynamic_data = jsonb_set(COALESCE(dynamic_data, '{}')::jsonb, ARRAY[$2::text], to_jsonb(serial), true)
                  WHERE category_id = $1
                    AND serial IS NOT NULL AND serial <> ''
                    AND COALESCE(dynamic_data->>$2, '') = ''`,
                [p.id, p.field]
            );
        }
    });

    console.log(`\n✅ Copia aplicada sobre ${totalPendiente} activo(s). La columna base se conserva.`);
    await AppDataSource.destroy();
}

main().catch(async (err) => {
    console.error('❌ Error:', err?.message || err);
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
    process.exit(1);
});
