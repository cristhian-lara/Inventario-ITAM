import { Asset, AssetStatus } from '../domain/Asset';
import { Category } from '../domain/Category';
import { ICatalogRepository } from '../domain/ICatalogRepository';

export class CatalogUseCases {
    constructor(private readonly repository: ICatalogRepository) {}

    async createCategory(id: string, name: string, schema: Record<string, any>): Promise<Category> {
        const category = new Category({ id, name, schemaDefinition: schema as any });
        await this.repository.saveCategory(category);
        return category;
    }

    async getAllCategories(): Promise<Category[]> {
        return this.repository.getAllCategories();
    }

    async updateCategory(id: string, name: string, schema: Record<string, any>): Promise<Category> {
        const existing = await this.repository.getCategoryById(id);
        if (!existing) {
            throw new Error(`La categoría con ID ${id} no existe.`);
        }
        const updatedCategory = new Category({ id, name, schemaDefinition: schema as any });
        await this.repository.saveCategory(updatedCategory);
        return updatedCategory;
    }

    async createAsset(id: string, categoryId: string, serial: string, dynamicAttributes: Record<string, any>, purchaseDate?: Date, warrantyMonths?: number, depreciationYears?: number): Promise<Asset> {
        const category = await this.repository.getCategoryById(categoryId);
        if (!category) {
            throw new Error(`La categoría con ID ${categoryId} no existe.`);
        }

        let assetId = id;
        const requiresPlaca = category.schemaDefinition.requiresPlacaIkusi !== false; // defaults to true
        
        if (!requiresPlaca && (!assetId || assetId.trim() === '')) {
            assetId = await this.repository.generateIncrementalId(categoryId);
        } else if (requiresPlaca && (!assetId || assetId.trim() === '')) {
            throw new Error('La Placa Ikusi es obligatoria para esta categoría.');
        }

        const asset = new Asset({
            id: assetId,
            categoryId,
            serial,
            status: 'AVAILABLE',
            dynamicAttributes,
            purchaseDate,
            warrantyMonths,
            depreciationYears
        }, category);

        await this.repository.saveAsset(asset);
        return asset;
    }

    async getAllAssets(): Promise<Asset[]> {
        return this.repository.getAllAssets();
    }

    async getAssetById(assetId: string): Promise<Asset | null> {
        return this.repository.getAssetById(assetId);
    }

    async updateAsset(assetId: string, serial: string | undefined, dynamicAttributes: Record<string, any>, purchaseDate?: Date, warrantyMonths?: number, depreciationYears?: number, purchasePrice?: number): Promise<Asset> {
        const asset = await this.repository.getAssetById(assetId);
        if (!asset) throw new Error(`El activo con ID ${assetId} no existe.`);

        const category = await this.repository.getCategoryById(asset.categoryId);
        if (!category) throw new Error('Categoría no encontrada');

        asset.updateBaseData(serial, purchaseDate, warrantyMonths, depreciationYears, purchasePrice);
        asset.updateAttributes(dynamicAttributes, category);

        await this.repository.saveAsset(asset);
        return asset;
    }

    async changeAssetStatus(assetId: string, newStatus: AssetStatus, reason?: string): Promise<Asset> {
        const asset = await this.repository.getAssetById(assetId);
        if (!asset) throw new Error(`El activo con ID ${assetId} no fue encontrado.`);
        
        asset.changeStatus(newStatus);
        
        if (newStatus === 'RETIRED' && reason) {
            asset.dynamicAttributes['Motivo de Baja'] = reason;
            asset.dynamicAttributes['Fecha de Baja'] = new Date().toISOString().split('T')[0];
        }

        await this.repository.saveAsset(asset);
        return asset;
    }
}
