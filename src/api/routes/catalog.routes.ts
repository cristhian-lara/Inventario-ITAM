import { Router } from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { z } from 'zod';
import { CatalogUseCases } from '../../modules/catalog/application/CatalogUseCases';
import { PostgresCatalogRepository } from '../../modules/catalog/infrastructure/PostgresCatalogRepository';
import { AppDataSource } from '../../shared/infrastructure/database/postgres';
import { HardwareUpgradeOrmEntity } from '../../modules/catalog/infrastructure/orm/HardwareUpgrade.entity';
import { v4 as uuidv4 } from 'uuid';
import { validateBody } from '../middlewares/validate.middleware';

const router = Router();

const createAssetSchema = z.object({
    id: z.string().min(1, 'id es requerido'),
    categoryId: z.coerce.number({ message: 'categoryId debe ser numérico' }),
    serial: z.string().optional(),
    dynamicAttributes: z.record(z.string(), z.any()).optional().default({}),
    purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'purchaseDate debe tener formato YYYY-MM-DD').optional(),
    warrantyMonths: z.coerce.number().optional(),
    depreciationYears: z.coerce.number().optional(),
    purchasePrice: z.coerce.number().optional(),
    vendorName: z.string().optional(),
    internalBuyer: z.string().optional(),
});

const updateAssetSchema = createAssetSchema.omit({ id: true, categoryId: true }).partial();

const categorySchema = z.object({
    name: z.string().min(1, 'name es requerido'),
    schema: z.record(z.string(), z.any()).optional().default({}),
});

const decommissionSchema = z.object({
    reason: z.string().min(1, 'reason es obligatorio'),
    blanccoReportId: z.string().optional(),
    notes: z.string().optional(),
});

const changeStatusSchema = z.object({
    status: z.string().min(1, 'status es requerido'),
    reason: z.string().optional(),
});

const renamePlateSchema = z.object({
    newId: z.string().min(1, 'La nueva Placa Ikusi es obligatoria'),
});

const upgradeSchema = z.object({
    upgrade_date: z.string().min(1, 'upgrade_date es obligatorio'),
    component: z.string().min(1, 'component es obligatorio'),
    old_value: z.string().optional(),
    new_value: z.string().min(1, 'new_value es obligatorio'),
    performed_by: z.string().optional(),
    notes: z.string().optional(),
});

const upload = multer({ storage: multer.memoryStorage() });

// Inyección de Dependencias Manual (MVP)
// El repositorio y los casos de uso se instancian normalmente
const catalogRepository = new PostgresCatalogRepository();
const catalogUseCases = new CatalogUseCases(catalogRepository);

router.post('/categories', validateBody(categorySchema), async (req, res) => {
    try {
        const { name, schema } = req.body;
        const category = await catalogUseCases.createCategory(name, schema);
        res.status(201).json(category);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.put('/categories/:id', validateBody(categorySchema), async (req, res) => {
    try {
        const { name, schema } = req.body;
        const category = await catalogUseCases.updateCategory(Number(req.params.id), name, schema);
        res.json(category);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.get('/categories', async (req, res) => {
    try {
        const categories = await catalogUseCases.getAllCategories();
        res.json(categories.map(c => ({
            id: c.id,
            name: c.name,
            schemaDefinition: c.schemaDefinition
        })));
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/assets/import', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }

        const isCsv = req.file.originalname.toLowerCase().endsWith('.csv');
        let workbook;
        if (isCsv) {
            const csvString = req.file.buffer.toString('utf8');
            workbook = xlsx.read(csvString, { type: 'string', cellDates: true });
        } else {
            workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
        }
        
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const records = xlsx.utils.sheet_to_json(sheet);

        const result = await catalogUseCases.importAssets(records);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/assets', validateBody(createAssetSchema), async (req, res) => {
    try {
        const { id, categoryId, serial, dynamicAttributes, purchaseDate, warrantyMonths, depreciationYears, purchasePrice, vendorName, internalBuyer } = req.body;
        const asset = await catalogUseCases.createAsset(
            id,
            Number(categoryId),
            serial,
            dynamicAttributes,
            purchaseDate ? new Date(`${purchaseDate.split('T')[0]}T12:00:00`) : undefined,
            warrantyMonths,
            depreciationYears,
            purchasePrice !== undefined && purchasePrice !== null && purchasePrice !== '' ? Number(purchasePrice) : undefined,
            vendorName || undefined,
            internalBuyer || undefined
        );
        res.status(201).json({
            id: asset.id,
            categoryId: asset.categoryId,
            serial: asset.serial,
            status: asset.status,
            dynamicAttributes: asset.dynamicAttributes,
            purchaseDate: asset.purchaseDate,
            warrantyMonths: asset.warrantyMonths,
            depreciationYears: asset.depreciationYears,
            purchasePrice: asset.purchasePrice,
            vendorName: asset.vendorName,
            internalBuyer: asset.internalBuyer
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.put('/assets/:id', validateBody(updateAssetSchema), async (req, res) => {
    try {
        const { serial, dynamicAttributes, purchaseDate, warrantyMonths, depreciationYears, purchasePrice, vendorName, internalBuyer } = req.body;
        const asset = await catalogUseCases.updateAsset(
            req.params.id,
            serial,
            dynamicAttributes,
            purchaseDate ? new Date(`${purchaseDate.split('T')[0]}T12:00:00`) : undefined,
            warrantyMonths,
            depreciationYears,
            purchasePrice,
            vendorName || undefined,
            internalBuyer || undefined
        );
        res.json({
            id: asset.id,
            categoryId: asset.categoryId,
            serial: asset.serial,
            status: asset.status,
            dynamicAttributes: asset.dynamicAttributes,
            purchaseDate: asset.purchaseDate,
            warrantyMonths: asset.warrantyMonths,
            depreciationYears: asset.depreciationYears,
            purchasePrice: asset.purchasePrice,
            vendorName: asset.vendorName,
            internalBuyer: asset.internalBuyer
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Corrección manual de la Placa Ikusi (equipos dados de alta sin placa por
// malas prácticas previas). Propaga el cambio al historial de asignaciones,
// mantenimientos y upgrades de hardware.
router.put('/assets/:id/plate', validateBody(renamePlateSchema), async (req, res) => {
    try {
        const asset = await catalogUseCases.renameAssetPlate(req.params.id, req.body.newId);
        res.json({
            id: asset.id,
            categoryId: asset.categoryId,
            serial: asset.serial,
            status: asset.status,
            dynamicAttributes: asset.dynamicAttributes,
            purchaseDate: asset.purchaseDate,
            warrantyMonths: asset.warrantyMonths,
            depreciationYears: asset.depreciationYears,
            purchasePrice: asset.purchasePrice,
            vendorName: asset.vendorName,
            internalBuyer: asset.internalBuyer
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Baja definitiva del activo (con referencia al borrado seguro en Blancco)
router.post('/assets/:id/decommission', validateBody(decommissionSchema), async (req, res) => {
    try {
        const { reason, blanccoReportId, notes } = req.body;
        const authorizedBy = (req as any).user?.username || 'Administrador TI';

        const asset = await catalogUseCases.decommissionAsset(req.params.id, { reason, authorizedBy, blanccoReportId, notes });

        res.json({
            message: 'Activo dado de baja correctamente.',
            id: asset.id,
            status: asset.status,
            disposal: asset.disposal
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.put('/assets/:id/status', validateBody(changeStatusSchema), async (req, res) => {
    try {
        const { status, reason } = req.body;
        const asset = await catalogUseCases.changeAssetStatus(req.params.id, status as any, reason);
        res.json({
            id: asset.id,
            status: asset.status,
            dynamicAttributes: asset.dynamicAttributes
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

const toAssetDto = (a: any) => ({
    id: a.id,
    categoryId: a.categoryId,
    serial: a.serial,
    status: a.status,
    dynamicAttributes: a.dynamicAttributes,
    purchaseDate: a.purchaseDate,
    warrantyMonths: a.warrantyMonths,
    depreciationYears: a.depreciationYears,
    purchasePrice: a.purchasePrice,
    vendorName: a.vendorName,
    internalBuyer: a.internalBuyer,
    disposal: a.disposal
});

// Paginación opcional vía ?page=&limit= (compatible hacia atrás: sin esos
// parámetros devuelve el arreglo completo, igual que antes).
router.get('/assets', async (req, res) => {
    if (req.query.page || req.query.limit) {
        const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
        const { items, total } = await catalogUseCases.getAssetsPaginated(page, limit);
        return res.json({ data: items.map(toAssetDto), total, page, limit });
    }
    const assets = await catalogUseCases.getAllAssets();
    res.json(assets.map(toAssetDto));
});

// ══════════════════════════════════════════════
// HARDWARE UPGRADES — Actualizaciones físicas
// ══════════════════════════════════════════════

// GET /api/catalog/assets/:assetId/upgrades — Listar upgrades de hardware
router.get('/assets/:assetId/upgrades', async (req, res) => {
    try {
        const upgradeRepo = AppDataSource.getRepository(HardwareUpgradeOrmEntity);
        const upgrades = await upgradeRepo.find({
            where: { asset_id: req.params.assetId },
            order: { upgrade_date: 'DESC' }
        });
        res.json(upgrades);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/catalog/assets/:assetId/upgrades — Registrar un nuevo upgrade
router.post('/assets/:assetId/upgrades', validateBody(upgradeSchema), async (req, res) => {
    try {
        const { upgrade_date, component, old_value, new_value, performed_by, notes } = req.body;

        // 1. Guardar el registro de upgrade
        const upgradeRepo = AppDataSource.getRepository(HardwareUpgradeOrmEntity);
        const entity = upgradeRepo.create({
            id: uuidv4(),
            asset_id: req.params.assetId,
            upgrade_date: new Date(upgrade_date),
            component,
            old_value: old_value || undefined,
            new_value,
            performed_by: performed_by || undefined,
            notes: notes || undefined
        });
        await upgradeRepo.save(entity);

        // 2. Actualizar la especificación correspondiente en dynamic_data del activo
        // Mapa componente → posibles claves en dynamic_data (igual que el frontend)
        const COMPONENT_TO_ATTR_KEYS: Record<string, string[]> = {
            'RAM':              ['MEMORIA RAM', 'Memoria RAM', 'RAM', 'Memoria', 'memoria', 'ram'],
            'Disco Duro':       ['Disco Duro', 'DISCO DURO', 'Disco', 'disco', 'Storage', 'Almacenamiento', 'SSD', 'HDD'],
            'Procesador':       ['Procesador', 'PROCESADOR', 'CPU', 'cpu', 'Processor'],
            'Pantalla':         ['Pantalla', 'PANTALLA', 'Monitor', 'Display', 'Resolución'],
            'Batería':          ['Batería', 'BATERIA', 'Battery', 'Bateria'],
            'Tarjeta de Red':   ['Tarjeta de Red', 'MAC', 'MAC Address', 'Red', 'Network'],
            'Tarjeta Gráfica':  ['Tarjeta Gráfica', 'GPU', 'gpu', 'Graphics'],
            'Teclado':          ['Teclado', 'TECLADO', 'Keyboard'],
            'Fuente de Poder':  ['Fuente de Poder', 'Fuente', 'PSU', 'Power'],
        };

        try {
            // Obtener el activo para conocer sus dynamic_data actuales
            const assetResult = await AppDataSource.query(
                `SELECT dynamic_data FROM assets WHERE id = $1`,
                [req.params.assetId]
            );

            if (assetResult && assetResult.length > 0) {
                const currentData: Record<string, any> = assetResult[0].dynamic_data || {};
                const candidateKeys = COMPONENT_TO_ATTR_KEYS[component] || [];

                // Buscar qué clave existe actualmente en el activo
                let matchedKey: string | null = null;
                for (const key of candidateKeys) {
                    if (currentData[key] !== undefined) {
                        matchedKey = key;
                        break;
                    }
                }

                // Si no encontró ninguna clave exacta, buscar por inclusión case-insensitive
                if (!matchedKey) {
                    const lowerComp = component.toLowerCase();
                    for (const key of Object.keys(currentData)) {
                        if (key.toLowerCase().includes(lowerComp)) {
                            matchedKey = key;
                            break;
                        }
                    }
                }

                // Actualizar la clave encontrada o agregarla si no existe
                const finalKey = matchedKey || candidateKeys[0] || component;
                const updatedData = { ...currentData, [finalKey]: new_value };
                await AppDataSource.query(
                    `UPDATE assets SET dynamic_data = $1 WHERE id = $2`,
                    [JSON.stringify(updatedData), req.params.assetId]
                );
            }
        } catch (updateErr: any) {
            // No bloqueamos la respuesta si falla la actualización del activo
            console.warn('[upgrade] No se pudo actualizar dynamic_data del activo:', updateErr.message);
        }

        res.status(201).json(entity);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
