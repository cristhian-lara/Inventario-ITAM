import { Asset } from '../domain/Asset';
import { Category } from '../domain/Category';
import { ICatalogRepository } from '../domain/ICatalogRepository';

export class InMemoryCatalogRepository implements ICatalogRepository {
    private categories: Map<string, Category> = new Map();
    private assets: Map<string, Asset> = new Map();

    async saveCategory(category: Category): Promise<void> {
        this.categories.set(category.id, category);
    }

    async getCategoryById(id: string): Promise<Category | null> {
        return this.categories.get(id) || null;
    }

    async saveAsset(asset: Asset): Promise<void> {
        this.assets.set(asset.id, asset);
    }

    async getAssetById(id: string): Promise<Asset | null> {
        return this.assets.get(id) || null;
    }

    async getAllAssets(): Promise<Asset[]> {
        return Array.from(this.assets.values());
    }
}
