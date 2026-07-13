import { Asset, AssetStatus } from '../domain/Asset';
import { Category } from '../domain/Category';
import { ICatalogRepository } from '../domain/ICatalogRepository';

export class CatalogUseCases {
    constructor(private readonly repository: ICatalogRepository) {}

    async createCategory(name: string, schema: Record<string, any>): Promise<Category> {
        const category = new Category({ name, schemaDefinition: schema as any });
        await this.repository.saveCategory(category);
        return category;
    }

    async getAllCategories(): Promise<Category[]> {
        return this.repository.getAllCategories();
    }

    async updateCategory(id: number, name: string, schema: Record<string, any>): Promise<Category> {
        const existing = await this.repository.getCategoryById(id);
        if (!existing) {
            throw new Error(`La categoría con ID ${id} no existe.`);
        }
        const updatedCategory = new Category({ id, name, schemaDefinition: schema as any });
        await this.repository.saveCategory(updatedCategory);
        return updatedCategory;
    }

    async createAsset(id: string, categoryId: number, serial: string, dynamicAttributes: Record<string, any>, purchaseDate?: Date, warrantyMonths?: number, depreciationYears?: number, purchasePrice?: number, vendorName?: string, internalBuyer?: string): Promise<Asset> {
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
            depreciationYears,
            purchasePrice,
            vendorName,
            internalBuyer
        }, category);

        await this.repository.saveAsset(asset);
        return asset;
    }

    /**
     * Baja definitiva de un activo con trazabilidad de auditoría
     * (motivo, autorizado por, referencia del borrado Blancco).
     */
    async decommissionAsset(assetId: string, info: { reason: string; authorizedBy: string; blanccoReportId?: string; notes?: string }): Promise<Asset> {
        const asset = await this.repository.getAssetById(assetId);
        if (!asset) throw new Error(`El activo con ID ${assetId} no existe.`);

        asset.decommission(info);
        await this.repository.saveAsset(asset);
        return asset;
    }

    async getAllAssets(): Promise<Asset[]> {
        return this.repository.getAllAssets();
    }

    async getAssetsPaginated(page: number, limit: number): Promise<{ items: Asset[]; total: number }> {
        return this.repository.getAssetsPaginated(page, limit);
    }

    async getAssetById(assetId: string): Promise<Asset | null> {
        return this.repository.getAssetById(assetId);
    }

    async updateAsset(assetId: string, serial: string | undefined, dynamicAttributes: Record<string, any>, purchaseDate?: Date, warrantyMonths?: number, depreciationYears?: number, purchasePrice?: number, vendorName?: string, internalBuyer?: string): Promise<Asset> {
        const asset = await this.repository.getAssetById(assetId);
        if (!asset) throw new Error(`El activo con ID ${assetId} no existe.`);

        const category = await this.repository.getCategoryById(asset.categoryId);
        if (!category) throw new Error('Categoría no encontrada');

        asset.updateBaseData(serial, purchaseDate, warrantyMonths, depreciationYears, purchasePrice, vendorName, internalBuyer);
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

    async importAssets(records: any[]): Promise<{ successful: number; failed: number; errors: string[] }> {
        let successful = 0;
        let failed = 0;
        const errors: string[] = [];

        const allCategories = await this.repository.getAllCategories();

        for (const [index, record] of records.entries()) {
            try {
                // Known columns
                const rawId = record['Placa Ikusi'] || record.PlacaIkusi || record.ID || record.id || '';
                const categoryRaw = record['Categoría'] || record.Categoria || record.Category || record.category || record.categoryId;
                const serial = record['Serial'] || record.serial || record.SerialNumber;
                const purchaseDateRaw = record['Fecha de Compra'] || record.PurchaseDate || record.purchaseDate;
                const warrantyMonthsRaw = record['Meses Garantía'] || record.WarrantyMonths || record.warrantyMonths;
                const depreciationYearsRaw = record['Años Depreciación'] || record.DepreciationYears || record.depreciationYears;
                const vendorNameRaw = record['Proveedor'] || record.Vendor || record.vendorName;
                const internalBuyerRaw = record['Comprador Interno'] || record.InternalBuyer || record.internalBuyer;

                if (!categoryRaw || !serial) {
                    throw new Error('Faltan campos obligatorios (Categoría, Serial)');
                }

                const category = allCategories.find(c => c.id === Number(categoryRaw) || c.name.toLowerCase() === String(categoryRaw).toLowerCase().trim());
                if (!category) {
                    throw new Error(`La categoría '${categoryRaw}' no existe.`);
                }

                // Dynamic attributes
                const knownKeys = ['Placa Ikusi', 'PlacaIkusi', 'ID', 'id', 'Categoría', 'Categoria', 'Category', 'category', 'categoryId', 'Serial', 'serial', 'SerialNumber', 'Fecha de Compra', 'PurchaseDate', 'purchaseDate', 'Meses Garantía', 'WarrantyMonths', 'warrantyMonths', 'Años Depreciación', 'DepreciationYears', 'depreciationYears', 'Precio Compra', 'PurchasePrice', 'purchasePrice', 'Proveedor', 'Vendor', 'vendorName', 'Comprador Interno', 'InternalBuyer', 'internalBuyer'];
                const dynamicAttributes: Record<string, any> = {};
                
                // Copy all unknown keys first
                for (const key of Object.keys(record)) {
                    if (!knownKeys.includes(key)) {
                        dynamicAttributes[key] = record[key];
                    }
                }

                // Match with category schema fields
                if (category.schemaDefinition && category.schemaDefinition.fields) {
                    for (const field of category.schemaDefinition.fields) {
                        const matchedKey = Object.keys(dynamicAttributes).find(k => 
                            k.toLowerCase().trim() === field.name.toLowerCase().trim() ||
                            k.toLowerCase().replace('fehca', 'fecha') === field.name.toLowerCase().trim()
                        );

                        if (matchedKey) {
                            let val = dynamicAttributes[matchedKey];
                            
                            if (matchedKey !== field.name) {
                                delete dynamicAttributes[matchedKey];
                            }

                            if (field.type === 'select' && field.options) {
                                const strVal = String(val).trim().toLowerCase();
                                const optionMatch = field.options.find((opt: string) => String(opt).trim().toLowerCase() === strVal);
                                if (optionMatch) {
                                    val = optionMatch;
                                } else {
                                    val = String(val).trim();
                                }
                            } else if (val instanceof Date) {
                                val = val.toISOString().split('T')[0];
                            }

                            dynamicAttributes[field.name] = val;
                        }
                    }
                }

                // parse dates and numbers safely
                let purchaseDate: Date | undefined = undefined;
                if (purchaseDateRaw) {
                    // Excel might return a number for dates, or a string
                    if (typeof purchaseDateRaw === 'number') {
                        purchaseDate = new Date((purchaseDateRaw - (25567 + 2)) * 86400 * 1000); // Excel date conversion
                    } else {
                        purchaseDate = new Date(purchaseDateRaw);
                    }
                }

                const warrantyMonths = warrantyMonthsRaw ? parseInt(String(warrantyMonthsRaw), 10) : undefined;
                const depreciationYears = depreciationYearsRaw ? parseInt(String(depreciationYearsRaw), 10) : undefined;

                await this.createAsset(
                    String(rawId).trim(),
                    category.id as number,
                    String(serial).trim(),
                    dynamicAttributes,
                    purchaseDate,
                    warrantyMonths,
                    depreciationYears,
                    undefined,
                    vendorNameRaw ? String(vendorNameRaw).trim() : undefined,
                    internalBuyerRaw ? String(internalBuyerRaw).trim() : undefined
                );
                
                successful++;
            } catch (error: any) {
                failed++;
                errors.push(`Fila ${index + 2}: ${error.message}`);
            }
        }

        return { successful, failed, errors };
    }
}
