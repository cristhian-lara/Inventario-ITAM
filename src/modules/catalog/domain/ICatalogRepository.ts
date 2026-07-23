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
    /**
     * Siguiente ID consecutivo para una categoría sin Placa Ikusi. Con `prefix`
     * el consecutivo es global por prefijo (PER001, PER002...) para que dos
     * categorías que lo compartan nunca colisionen en la PK.
     */
    generateIncrementalId(categoryId: number, prefix?: string): Promise<string>;
    /**
     * Renombra el identificador (Placa Ikusi) de un activo, propagando el
     * cambio a las tablas que lo referencian por texto (sin FK real):
     * assignments, maintenances, hardware_upgrades.
     */
    renameAssetPlate(oldId: string, newId: string): Promise<void>;
}
