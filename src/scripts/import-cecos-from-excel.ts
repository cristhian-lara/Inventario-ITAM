/**
 * Importa CECOS desde un Excel/CSV a la tabla `cecos`.
 *
 * Columnas usadas (case-insensitive): CECO (-> id), Nombre (-> name),
 * Descripción (-> description). Cualquier otra columna (p. ej. RESPONSABLE)
 * se ignora. Es idempotente: los CECO que ya existen se actualizan por id
 * (ON CONFLICT DO UPDATE), no se duplican.
 *
 * Tiene dos usos:
 *
 * 1) Cargar en la BD actual (LOCAL) — upsert directo:
 *      Vista previa:  npx ts-node src/scripts/import-cecos-from-excel.ts "<ruta.xlsx>"
 *      Ejecutar:      npx ts-node src/scripts/import-cecos-from-excel.ts "<ruta.xlsx>" --force
 *
 * 2) Generar un SQL portátil para PRODUCCIÓN (no toca ninguna BD):
 *      npx ts-node src/scripts/import-cecos-from-excel.ts "<ruta.xlsx>" --sql
 *      -> genera cecos-export.sql (idempotente) para aplicarlo por consola en prod.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';
import { AppDataSource } from '../shared/infrastructure/database/postgres';

interface CecoRow { id: string; name: string; description: string | null; }

// Escapa comillas simples para literales SQL.
const sqlStr = (value: string | null): string =>
    value === null ? 'NULL' : `'${String(value).replace(/'/g, "''")}'`;

function readCecosFromFile(filePath: string): CecoRow[] {
    const isCsv = filePath.toLowerCase().endsWith('.csv');
    const workbook = isCsv
        ? xlsx.read(fs.readFileSync(filePath, 'utf8'), { type: 'string' })
        : xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const records = xlsx.utils.sheet_to_json(sheet, { defval: null }) as any[];

    const rows: CecoRow[] = [];
    records.forEach((record, index) => {
        const normalized: Record<string, string> = {};
        for (const key of Object.keys(record)) normalized[key.toLowerCase().trim()] = key;
        const pick = (...cands: string[]) => {
            for (const c of cands) {
                const k = normalized[c.toLowerCase().trim()];
                if (k !== undefined && record[k] !== null && record[k] !== '') return record[k];
            }
            return undefined;
        };

        const idRaw = pick('CECO', 'Ceco', 'ID', 'id');
        const nameRaw = pick('Nombre', 'Name', 'nombre');
        const descRaw = pick('Descripción', 'Descripcion', 'Description', 'descripcion');

        if (idRaw === undefined || nameRaw === undefined) {
            console.warn(`  ⚠ Fila ${index + 2}: sin CECO o Nombre; se omite.`);
            return;
        }
        rows.push({
            id: String(idRaw).trim(),
            name: String(nameRaw).trim(),
            description: descRaw !== undefined ? String(descRaw).trim() : null,
        });
    });
    return rows;
}

async function main() {
    const args = process.argv.slice(2);
    const filePath = args.find(a => !a.startsWith('--'));
    const force = args.includes('--force');
    const asSql = args.includes('--sql');

    if (!filePath) {
        console.error('❌ Falta la ruta del Excel/CSV.');
        console.error('   Ej: npx ts-node src/scripts/import-cecos-from-excel.ts "C:\\ruta\\LISTADO CECOS IKUSI.xlsx"');
        process.exit(1);
    }
    if (!fs.existsSync(filePath)) {
        console.error(`❌ No se encontró el archivo: ${filePath}`);
        process.exit(1);
    }

    const rows = readCecosFromFile(filePath);
    console.log(`\n📄 CECOS leídos del archivo: ${rows.length}`);
    if (rows.length === 0) { process.exit(0); }

    // Modo 2: generar SQL portátil (no toca ninguna BD).
    if (asSql) {
        const outPath = path.resolve('cecos-export.sql');
        const lines: string[] = [
            '-- CECOS generados desde el Excel para inyectar en producción.',
            `-- Generado: ${new Date().toISOString()}`,
            `-- Total: ${rows.length}`,
            'BEGIN;',
        ];
        for (const r of rows) {
            lines.push(
                `INSERT INTO cecos (id, name, description) VALUES (${sqlStr(r.id)}, ${sqlStr(r.name)}, ${sqlStr(r.description)}) ` +
                `ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;`
            );
        }
        lines.push('COMMIT;', '');
        fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
        console.log(`\n✅ SQL generado (${rows.length} CECOS): ${outPath}`);
        console.log('   Aplícalo en prod por consola (ver instrucciones de docker exec + psql).');
        return;
    }

    // Modo 1: upsert contra la BD actual (local).
    await AppDataSource.initialize();
    console.log('✅ Base de datos conectada.');

    const existing = await AppDataSource.query('SELECT id FROM cecos') as Array<{ id: string }>;
    const existingIds = new Set(existing.map(e => String(e.id)));
    const nuevos = rows.filter(r => !existingIds.has(r.id));
    const actualizar = rows.filter(r => existingIds.has(r.id));

    console.log(`   Nuevos:       ${nuevos.length}`);
    console.log(`   Ya existen:   ${actualizar.length} (se actualizarán name/description)`);

    if (!force) {
        console.log('\n⚠️  Vista previa: NO se escribió nada.');
        console.log('   Para ejecutar el upsert real, corre de nuevo con --force.');
        await AppDataSource.destroy();
        return;
    }

    await AppDataSource.transaction(async (manager) => {
        for (const r of rows) {
            await manager.query(
                `INSERT INTO cecos (id, name, description) VALUES ($1, $2, $3)
                 ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,
                [r.id, r.name, r.description]
            );
        }
    });

    console.log(`\n✅ Upsert completado: ${nuevos.length} creados, ${actualizar.length} actualizados.`);
    await AppDataSource.destroy();
}

main().catch(async (err) => {
    console.error('❌ Error al importar CECOS:', err);
    try { await AppDataSource.destroy(); } catch { /* noop */ }
    process.exit(1);
});
