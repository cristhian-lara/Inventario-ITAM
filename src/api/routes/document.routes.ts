import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { In } from 'typeorm';
import { AppDataSource } from '../../shared/infrastructure/database/postgres';
import { PostgresAssignmentRepository } from '../../modules/assignment/infrastructure/PostgresAssignmentRepository';
import { PostgresMaintenanceRepository } from '../../modules/maintenance/infrastructure/PostgresMaintenanceRepository';
import { AssetOrmEntity } from '../../modules/catalog/infrastructure/orm/Asset.entity';

export const documentRouter = Router();

interface FileData {
    filename: string;
    url: string;
    date: string;
    placa?: string;
    serial?: string;
}

/**
 * Extrae el ID de asignación/mantenimiento del nombre del PDF. El formato actual
 * es "{Tipo} {Nombre} - {ID}.pdf", por lo que el ID es el último segmento tras
 * " - ". Devuelve null cuando el nombre no sigue ese patrón (formatos históricos),
 * en cuyo caso el acta queda sin placa/serial pero sigue apareciendo en el listado.
 */
function extractActId(filename: string): string | null {
    const withoutExt = filename.replace(/\.pdf$/i, '');
    const parts = withoutExt.split(' - ');
    if (parts.length < 2) return null;
    const id = parts[parts.length - 1].trim();
    return id || null;
}

documentRouter.get('/', async (req, res) => {
    try {
        const storageDir = path.join(__dirname, '../../../storage/pdfs');

        if (!fs.existsSync(storageDir)) {
            return res.json({ assignments: [], returns: [], maintenances: [] });
        }

        const files = fs.readdirSync(storageDir);
        const result = {
            assignments: [] as FileData[],
            returns: [] as FileData[],
            maintenances: [] as FileData[]
        };

        // Índice: ID de acta -> registros de archivo (varios PDFs pueden compartir ID)
        const assignmentFileIndex = new Map<string, FileData[]>();
        const maintenanceFileIndex = new Map<string, FileData[]>();

        const indexFile = (index: Map<string, FileData[]>, filename: string, fileData: FileData) => {
            const id = extractActId(filename);
            if (!id) return;
            const bucket = index.get(id);
            if (bucket) bucket.push(fileData);
            else index.set(id, [fileData]);
        };

        for (const file of files) {
            if (!file.endsWith('.pdf')) continue;

            const filePath = path.join(storageDir, file);
            const stats = fs.statSync(filePath);

            const fileData: FileData = {
                filename: file,
                url: `/pdfs/${file}`,
                date: stats.mtime.toISOString(),
            };

            // Formato actual: "Asignación Nombre - ID.pdf" | Anteriores: "Acta de Asignacion - ...", "acta-..."
            if (file.startsWith('Asignación ') || file.startsWith('Asignacion ') || file.startsWith('Acta de Asignacion -') || file.startsWith('acta-')) {
                result.assignments.push(fileData);
                indexFile(assignmentFileIndex, file, fileData);
            // Formato actual: "Devolución Nombre - ID.pdf" (parcial) o "Paz y Salvo Nombre - ID.pdf" (total)
            } else if (file.startsWith('Devolución ') || file.startsWith('Devolucion ') || file.startsWith('Paz y Salvo') || file.startsWith('pazysalvo-')) {
                result.returns.push(fileData);
                indexFile(assignmentFileIndex, file, fileData);
            // Formato actual: "Mantenimiento Nombre - ID.pdf" | Anteriores: "Acta de Mantenimiento - ...", "acta_mantenimiento_..."
            } else if (file.startsWith('Mantenimiento ') || file.startsWith('Acta de Mantenimiento -') || file.startsWith('acta_mantenimiento_')) {
                result.maintenances.push(fileData);
                indexFile(maintenanceFileIndex, file, fileData);
            }
        }

        // Enriquecimiento con placa/serial. Todo esto es "best-effort": si la BD no
        // está disponible o un ID no existe, el listado se devuelve igual sin placa/serial.
        try {
            const assignmentIds = [...assignmentFileIndex.keys()];
            const maintenanceIds = [...maintenanceFileIndex.keys()];

            const assignmentRepo = new PostgresAssignmentRepository();
            const maintenanceRepo = new PostgresMaintenanceRepository(AppDataSource);

            const [assignments, maintenances] = await Promise.all([
                assignmentRepo.findByIds(assignmentIds),
                maintenanceRepo.findByIds(maintenanceIds),
            ]);

            // ID de acta -> placa (asset_id). La placa es la PK del activo.
            const actIdToAsset = new Map<string, string>();
            for (const a of assignments) actIdToAsset.set(a.id, a.assetId);
            for (const m of maintenances) actIdToAsset.set(m.id, m.assetId);

            // Batch de seriales para todas las placas referenciadas.
            const assetIds = [...new Set([...actIdToAsset.values()])];
            const assetToSerial = new Map<string, string | undefined>();
            if (assetIds.length > 0) {
                const assetRepo = AppDataSource.getRepository(AssetOrmEntity);
                const assetRows = await assetRepo.find({
                    where: { id: In(assetIds) },
                    select: { id: true, serial: true },
                });
                for (const row of assetRows) assetToSerial.set(row.id, row.serial);
            }

            // Volcamos placa/serial a cada archivo a través de los índices.
            const applyEnrichment = (index: Map<string, FileData[]>) => {
                for (const [actId, fileDatas] of index) {
                    const assetId = actIdToAsset.get(actId);
                    if (!assetId) continue;
                    const serial = assetToSerial.get(assetId);
                    for (const fd of fileDatas) {
                        fd.placa = assetId;
                        if (serial) fd.serial = serial;
                    }
                }
            };
            applyEnrichment(assignmentFileIndex);
            applyEnrichment(maintenanceFileIndex);
        } catch (enrichError: any) {
            // No rompemos el listado si falla el enriquecimiento; solo lo registramos.
            console.error('Error enriqueciendo actas con placa/serial:', enrichError?.message || enrichError);
        }

        result.assignments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        result.returns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        result.maintenances.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: 'Error reading documents directory', details: error.message });
    }
});
