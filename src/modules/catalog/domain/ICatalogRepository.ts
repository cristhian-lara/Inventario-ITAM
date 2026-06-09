import { Asset } from './Asset';
import { Category } from './Category';

export interface ICatalogRepository {
    saveCategory(category: Category): Promise<void>;
    getCategoryById(id: string): Promise<Category | null>;
    getAllCategories(): Promise<Category[]>;
    saveAsset(asset: Asset): Promise<void>;
    getAssetById(id: string): Promise<Asset | null>;
    getAllAssets(): Promise<Asset[]>;
    generateIncrementalId(categoryId: string): Promise<string>;
}
