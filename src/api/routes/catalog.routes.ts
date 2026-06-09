import { Router } from 'express';
import { CatalogUseCases } from '../../modules/catalog/application/CatalogUseCases';
import { PostgresCatalogRepository } from '../../modules/catalog/infrastructure/PostgresCatalogRepository';

const router = Router();

// Inyección de Dependencias Manual (MVP)
// El repositorio y los casos de uso se instancian normalmente
const catalogRepository = new PostgresCatalogRepository();
const catalogUseCases = new CatalogUseCases(catalogRepository);

router.post('/categories', async (req, res) => {
    try {
        const { id, name, schema } = req.body;
        const category = await catalogUseCases.createCategory(id, name, schema);
        res.status(201).json(category);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.put('/categories/:id', async (req, res) => {
    try {
        const { name, schema } = req.body;
        const category = await catalogUseCases.updateCategory(req.params.id, name, schema);
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

router.post('/assets', async (req, res) => {
    try {
        const { id, categoryId, serial, dynamicAttributes, purchaseDate, warrantyMonths, depreciationYears, purchasePrice } = req.body;
        const asset = await catalogUseCases.createAsset(
            id, 
            categoryId, 
            serial, 
            dynamicAttributes,
            purchaseDate ? new Date(purchaseDate) : undefined,
            warrantyMonths,
            depreciationYears
        );
        res.status(201).json({
            id: asset.id,
            categoryId: asset.categoryId,
            serial: asset.serial,
            status: asset.status,
            dynamicAttributes: asset.dynamicAttributes,
            purchaseDate: asset.purchaseDate,
            warrantyMonths: asset.warrantyMonths,
            depreciationYears: asset.depreciationYears
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.put('/assets/:id', async (req, res) => {
    try {
        const { serial, dynamicAttributes, purchaseDate, warrantyMonths, depreciationYears, purchasePrice } = req.body;
        const asset = await catalogUseCases.updateAsset(
            req.params.id,
            serial,
            dynamicAttributes,
            purchaseDate ? new Date(purchaseDate) : undefined,
            warrantyMonths,
            depreciationYears,
            purchasePrice
        );
        res.json({
            id: asset.id,
            categoryId: asset.categoryId,
            serial: asset.serial,
            status: asset.status,
            dynamicAttributes: asset.dynamicAttributes,
            purchaseDate: asset.purchaseDate,
            warrantyMonths: asset.warrantyMonths
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.put('/assets/:id/status', async (req, res) => {
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

router.get('/assets', async (req, res) => {
    const assets = await catalogUseCases.getAllAssets();
    res.json(assets.map(a => ({
        id: a.id,
        categoryId: a.categoryId,
        serial: a.serial,
        status: a.status,
        dynamicAttributes: a.dynamicAttributes,
        purchaseDate: a.purchaseDate,
        warrantyMonths: a.warrantyMonths,
        depreciationYears: a.depreciationYears
    })));
});

export default router;
