/**
 * Migración de IDs de Periféricos al formato con prefijo (PER001, PER002...).
 *
 * Qué hace:
 *  1. Marca la categoría con `idPrefix` en su attributes_schema, para que los
 *     activos que se creen de ahí en adelante ya nazcan numerados con el prefijo.
 *  2. Renombra los activos existentes de esa categoría que aún no cumplan el
 *     formato, propagando el nuevo ID a assignments, maintenances y
 *     hardware_upgrades (guardan asset_id como texto, sin FK real).
 *
 * Todo ocurre en UNA transacción: o se migran todos o no se migra ninguno.
 * Los activos que ya cumplen el formato se dejan intactos, así que el script
 * es idempotente y se puede volver a correr sin efectos.
 *
 * Uso:
 *   Vista previa:  npx ts-node src/scripts/migrate-peripheral-ids.ts
 *   Ejecutar:      npx ts-node src/scripts/migrate-peripheral-ids.ts --force
 *   Otra categoría/prefijo:
 *                  npx ts-node src/scripts/migrate-peripheral-ids.ts --categoria="Monitores" --prefijo=MON --force
 */
import { AppDataSource } from '../shared/infrastructure/database/postgres';

function arg(name: string, fallback: string): string {
    const found = process.argv.find(a => a.startsWith(`--${name}=`));
    return found ? found.slice(name.length + 3).replace(/^["']|["']$/g, '').trim() : fallback;
}

const CATEGORY_NAME = arg('categoria', 'Periféricos');
const PREFIX = arg('prefijo', 'PER').toUpperCase();
const PAD = 3;

async function main() {
    const force = process.argv.includes('--force');

    if (!/^[A-Z0-9]+$/.test(PREFIX)) {
        console.error(`❌ Prefijo inválido: "${PREFIX}". Solo letras y números.`);
        process.exit(1);
    }

    await AppDataSource.initialize();
    console.log('✅ Base de datos conectada.');

    const categories = await AppDataSource.query(
        'SELECT id, name, attributes_schema FROM categories'
    ) as Array<{ id: number; name: string; attributes_schema: any }>;

    const normalized = CATEGORY_NAME.trim().toLowerCase();
    const category = categories.find(c => c.name.trim().toLowerCase() === normalized);
    if (!category) {
        console.error(`❌ No se encontró la categoría "${CATEGORY_NAME}". Existentes: ${categories.map(c => c.name).join(', ')}`);
        process.exit(1);
    }

    const assets = await AppDataSource.query(
        'SELECT id FROM assets WHERE category_id = $1 ORDER BY id',
        [category.id]
    ) as Array<{ id: string }>;

    const alreadyMigrated = assets.filter(a => new RegExp(`^${PREFIX}\\d+$`).test(a.id));
    const pending = assets.filter(a => !new RegExp(`^${PREFIX}\\d+$`).test(a.id));

    // El consecutivo arranca después del mayor sufijo ya existente con el prefijo
    // en TODA la tabla, no solo en esta categoría: el ID es la llave primaria.
    const maxRow = await AppDataSource.query(
        // $1::int obligatorio: como texto, Postgres resuelve SUBSTRING(id FROM $1)
        // por su variante de regex y devuelve un dígito suelto, no el sufijo.
        `SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM $1::int) AS INTEGER)), 0) AS max
           FROM assets WHERE id ~ $2`,
        [PREFIX.length + 1, `^${PREFIX}[0-9]+$`]
    ) as Array<{ max: string }>;
    let next = parseInt(maxRow[0]?.max ?? '0', 10);

    const plan = pending.map(a => ({ oldId: a.id, newId: `${PREFIX}${(++next).toString().padStart(PAD, '0')}` }));

    console.log(`\n📊 Categoría "${category.name}" (id ${category.id})`);
    console.log(`   Activos totales:      ${assets.length}`);
    console.log(`   Ya con formato ${PREFIX}:  ${alreadyMigrated.length}`);
    console.log(`   Por renombrar:        ${plan.length}`);
    if (plan.length) {
        console.log('\n   Plan de renombrado:');
        plan.forEach(p => console.log(`     ${p.oldId}  →  ${p.newId}`));
    }

    const currentPrefix = category.attributes_schema?.idPrefix;
    if (currentPrefix !== PREFIX) {
        console.log(`\n   attributes_schema.idPrefix: ${currentPrefix ?? '(sin definir)'}  →  ${PREFIX}`);
    } else {
        console.log(`\n   attributes_schema.idPrefix ya es "${PREFIX}" (sin cambios).`);
    }

    if (!force) {
        console.log('\n⚠ Vista previa. Nada se ha modificado. Vuelve a correr con --force para aplicar.');
        await AppDataSource.destroy();
        return;
    }

    await AppDataSource.transaction(async (tx) => {
        await tx.query(
            `UPDATE categories
                SET attributes_schema = jsonb_set(attributes_schema::jsonb, '{idPrefix}', to_jsonb($1::text), true)
              WHERE id = $2`,
            [PREFIX, category.id]
        );

        for (const { oldId, newId } of plan) {
            await tx.query('UPDATE assets SET id = $1 WHERE id = $2', [newId, oldId]);
            await tx.query('UPDATE assignments SET asset_id = $1 WHERE asset_id = $2', [newId, oldId]);
            await tx.query('UPDATE maintenances SET asset_id = $1 WHERE asset_id = $2', [newId, oldId]);
            await tx.query('UPDATE hardware_upgrades SET asset_id = $1 WHERE asset_id = $2', [newId, oldId]);
        }
    });

    console.log(`\n✅ Migración aplicada: ${plan.length} activo(s) renombrado(s), prefijo "${PREFIX}" configurado.`);
    await AppDataSource.destroy();
}

main().catch(async (err) => {
    console.error('❌ Error en la migración:', err?.message || err);
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
    process.exit(1);
});
