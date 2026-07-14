import { Asset } from './Asset';
import { Category } from './Category';

export interface ICatalogRepository {
    saveCategory(category: Category): Promise<void>;
    getCategoryById(id: number): Promise<Category | null>;
    getAllCategories(): Promise<Category[]>;
    saveAsset(asset: Asset): Promise<void>;
    getAssetById(id: string): Promise<Asset | null>;
    getAllAssets(): Promise<Asset[]>;
    getAssetsPaginated(page: number, limit: number): Promise<{ items: Asset[]; total: number }>;
    generateIncrementalId(categoryId: number): Promise<string>;
    /**
     * Renombra el identificador (Placa Ikusi) de un activo, propagando el
     * cambio a las tablas que lo referencian por texto (sin FK real):
     * assignments, maintenances, hardware_upgrades.
     */
    renameAssetPlate(oldId: string, newId: string): Promise<void>;
}
