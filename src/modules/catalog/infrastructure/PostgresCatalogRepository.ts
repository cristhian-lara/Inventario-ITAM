import { AppDataSource } from '../../../shared/infrastructure/database/postgres';
import { Asset, AssetStatus } from '../domain/Asset';
import { Category } from '../domain/Category';
import { ICatalogRepository } from '../domain/ICatalogRepository';
import { AssetOrmEntity } from './orm/Asset.entity';
import { CategoryOrmEntity } from './orm/Category.entity';

export class PostgresCatalogRepository implements ICatalogRepository {
    private categoryRepo = AppDataSource.getRepository(CategoryOrmEntity);
    private assetRepo = AppDataSource.getRepository(AssetOrmEntity);

    async saveCategory(category: Category): Promise<void> {
        const ormEntity = this.categoryRepo.create({
            id: category.id,
            name: category.name,
            attributes_schema: category.schemaDefinition
        });
        await this.categoryRepo.save(ormEntity);
    }

    async getCategoryById(id: string): Promise<Category | null> {
        const ormEntity = await this.categoryRepo.findOneBy({ id });
        if (!ormEntity) return null;
        
        return new Category({
            id: ormEntity.id,
            name: ormEntity.name,
            schemaDefinition: ormEntity.attributes_schema
        });
    }

    async getAllCategories(): Promise<Category[]> {
        const ormEntities = await this.categoryRepo.find({ order: { name: 'ASC' } });
        return ormEntities.map(ormEntity => new Category({
            id: ormEntity.id,
            name: ormEntity.name,
            schemaDefinition: ormEntity.attributes_schema
        }));
    }

    async saveAsset(asset: Asset): Promise<void> {
        const ormEntity = this.assetRepo.create({
            id: asset.id,
            category_id: asset.categoryId,
            serial: asset.serial,
            status: asset.status,
            dynamic_data: asset.dynamicAttributes,
            purchase_date: asset.purchaseDate,
            warranty_months: asset.warrantyMonths,
            depreciation_years: asset.depreciationYears,
            purchase_price: asset.purchasePrice
        });
        await this.assetRepo.save(ormEntity);
    }

    async getAssetById(id: string): Promise<Asset | null> {
        const ormEntity = await this.assetRepo.findOneBy({ id });
        if (!ormEntity) return null;

        // Necesitamos la categoría para instanciar el Agregado de Dominio validando sus datos
        const category = await this.getCategoryById(ormEntity.category_id);
        if (!category) throw new Error('Inconsistencia en BD: Activo sin Categoría');

        return new Asset({
            id: ormEntity.id,
            categoryId: ormEntity.category_id,
            serial: ormEntity.serial,
            status: ormEntity.status as AssetStatus,
            dynamicAttributes: ormEntity.dynamic_data,
            purchaseDate: ormEntity.purchase_date,
            warrantyMonths: ormEntity.warranty_months,
            depreciationYears: ormEntity.depreciation_years,
            purchasePrice: ormEntity.purchase_price ? parseFloat(ormEntity.purchase_price as any) : undefined
        });
    }

    async getAllAssets(): Promise<Asset[]> {
        const ormEntities = await this.assetRepo.find();
        const assets: Asset[] = [];
        
        for (const orm of ormEntities) {
            const category = await this.getCategoryById(orm.category_id);
            if (category) {
                assets.push(new Asset({
                    id: orm.id,
                    categoryId: orm.category_id,
                    serial: orm.serial,
                    status: orm.status as AssetStatus,
                    dynamicAttributes: orm.dynamic_data,
                    purchaseDate: orm.purchase_date,
                    warrantyMonths: orm.warranty_months,
                    depreciationYears: orm.depreciation_years,
                    purchasePrice: orm.purchase_price ? parseFloat(orm.purchase_price as any) : undefined
                }));
            }
        }
        return assets;
    }

    async generateIncrementalId(categoryId: string): Promise<string> {
        const count = await this.assetRepo.count({
            where: { category_id: categoryId }
        });
        const nextId = count + 1;
        return nextId.toString().padStart(6, '0');
    }
}
