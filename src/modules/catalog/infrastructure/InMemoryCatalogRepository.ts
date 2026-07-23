import { Asset } from '../domain/Asset';
import { Category } from '../domain/Category';
import { ICatalogRepository } from '../domain/ICatalogRepository';

export class InMemoryCatalogRepository implements ICatalogRepository {
    private categories: Map<number, Category> = new Map();
    private assets: Map<string, Asset> = new Map();
    private nextCategoryId = 1;

    async saveCategory(category: Category): Promise<void> {
        // Emula el autoincremental de la BD cuando la categoría aún no tiene id
        const id = category.id ?? this.nextCategoryId++;
        const toStore = category.id !== undefined
            ? category
            : new Category({ id, name: category.name, schemaDefinition: category.schemaDefinition as any });
        this.categories.set(id, toStore);
    }

    async getCategoryById(id: number): Promise<Category | null> {
        return this.categories.get(id) || null;
    }

    async getAllCategories(): Promise<Category[]> {
        return Array.from(this.categories.values());
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

    async getAssetsPaginated(page: number, limit: number): Promise<{ items: Asset[]; total: number }> {
        const all = Array.from(this.assets.values());
        const start = (page - 1) * limit;
        return { items: all.slice(start, start + limit), total: all.length };
    }

    async generateIncrementalId(categoryId: number, prefix?: string): Promise<string> {
        if (prefix) {
            const pattern = new RegExp(`^${prefix}(\\d+)$`);
            const max = Array.from(this.assets.values()).reduce((acc, a) => {
                const match = pattern.exec(a.id);
                return match ? Math.max(acc, parseInt(match[1], 10)) : acc;
            }, 0);
            return `${prefix}${(max + 1).toString().padStart(3, '0')}`;
        }
        const count = Array.from(this.assets.values()).filter(a => a.categoryId === categoryId).length;
        return (count + 1).toString().padStart(6, '0');
    }

    async renameAssetPlate(oldId: string, newId: string): Promise<void> {
        const asset = this.assets.get(oldId);
        if (!asset) throw new Error(`El activo con ID ${oldId} no existe.`);
        if (this.assets.has(newId)) throw new Error(`Ya existe un activo con la placa ${newId}.`);
        this.assets.delete(oldId);
        this.assets.set(newId, new Asset({ ...(asset as any).props, id: newId }));
    }
}
