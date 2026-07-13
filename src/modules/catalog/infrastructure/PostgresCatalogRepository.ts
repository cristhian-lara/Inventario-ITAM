import { EntityManager, Repository } from 'typeorm';
import { AppDataSource } from '../../../shared/infrastructure/database/postgres';
import { Asset, AssetStatus } from '../domain/Asset';
import { Category } from '../domain/Category';
import { ICatalogRepository } from '../domain/ICatalogRepository';
import { AssetOrmEntity } from './orm/Asset.entity';
import { CategoryOrmEntity } from './orm/Category.entity';

export class PostgresCatalogRepository implements ICatalogRepository {
    private categoryRepo: Repository<CategoryOrmEntity>;
    private assetRepo: Repository<AssetOrmEntity>;

    constructor(manager: EntityManager = AppDataSource.manager) {
        this.categoryRepo = manager.getRepository(CategoryOrmEntity);
        this.assetRepo = manager.getRepository(AssetOrmEntity);
    }

    async saveCategory(category: Category): Promise<void> {
        const ormEntity = this.categoryRepo.create({
            id: category.id,
            name: category.name,
            attributes_schema: category.schemaDefinition
        });
        await this.categoryRepo.save(ormEntity);
    }

    async getCategoryById(id: number): Promise<Category | null> {
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
            purchase_price: asset.purchasePrice,
            vendor_name: asset.vendorName,
            internal_buyer: asset.internalBuyer,
            disposal: asset.disposal
        });
        await this.assetRepo.save(ormEntity);
    }

    async getAssetById(id: string): Promise<Asset | null> {
        const ormEntity = await this.assetRepo.findOneBy({ id });
        if (!ormEntity) return null;

        let category = null;
        if (ormEntity.category_id != null) {
            category = await this.getCategoryById(ormEntity.category_id);
        }

        return new Asset({
            id: ormEntity.id,
            categoryId: ormEntity.category_id || 0,
            serial: ormEntity.serial,
            status: ormEntity.status as AssetStatus,
            dynamicAttributes: ormEntity.dynamic_data,
            purchaseDate: ormEntity.purchase_date,
            warrantyMonths: ormEntity.warranty_months,
            depreciationYears: ormEntity.depreciation_years,
            purchasePrice: ormEntity.purchase_price ? parseFloat(ormEntity.purchase_price as any) : undefined,
            vendorName: ormEntity.vendor_name,
            internalBuyer: ormEntity.internal_buyer,
            disposal: ormEntity.disposal
        });
    }

    async getAllAssets(): Promise<Asset[]> {
        const ormEntities = await this.assetRepo.find();
        const assets: Asset[] = [];
        
        for (const orm of ormEntities) {
            assets.push(new Asset({
                id: orm.id,
                categoryId: orm.category_id || 0,
                serial: orm.serial,
                status: orm.status as AssetStatus,
                dynamicAttributes: orm.dynamic_data,
                purchaseDate: orm.purchase_date,
                warrantyMonths: orm.warranty_months,
                depreciationYears: orm.depreciation_years,
                purchasePrice: orm.purchase_price ? parseFloat(orm.purchase_price as any) : undefined,
                vendorName: orm.vendor_name,
                internalBuyer: orm.internal_buyer,
                disposal: orm.disposal
            }));
        }
        return assets;
    }

    async getAssetsPaginated(page: number, limit: number): Promise<{ items: Asset[]; total: number }> {
        const [ormEntities, total] = await this.assetRepo.findAndCount({
            skip: (page - 1) * limit,
            take: limit,
            order: { id: 'ASC' }
        });
        const items = ormEntities.map(orm => new Asset({
            id: orm.id,
            categoryId: orm.category_id || 0,
            serial: orm.serial,
            status: orm.status as AssetStatus,
            dynamicAttributes: orm.dynamic_data,
            purchaseDate: orm.purchase_date,
            warrantyMonths: orm.warranty_months,
            depreciationYears: orm.depreciation_years,
            purchasePrice: orm.purchase_price ? parseFloat(orm.purchase_price as any) : undefined,
            vendorName: orm.vendor_name,
            internalBuyer: orm.internal_buyer,
            disposal: orm.disposal
        }));
        return { items, total };
    }

    async generateIncrementalId(categoryId: number): Promise<string> {
        const count = await this.assetRepo.count({
            where: { category_id: categoryId }
        });
        const nextId = count + 1;
        return nextId.toString().padStart(6, '0');
    }
}
