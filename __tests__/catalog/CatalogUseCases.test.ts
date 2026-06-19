import { CatalogUseCases } from '../../src/modules/catalog/application/CatalogUseCases';
import { ICatalogRepository } from '../../src/modules/catalog/domain/ICatalogRepository';
import { Asset } from '../../src/modules/catalog/domain/Asset';
import { Category } from '../../src/modules/catalog/domain/Category';

describe('CatalogUseCases', () => {
    let mockRepository: jest.Mocked<ICatalogRepository>;
    let useCases: CatalogUseCases;

    beforeEach(() => {
        mockRepository = {
            saveCategory: jest.fn(),
            getCategoryById: jest.fn(),
            getAllCategories: jest.fn(),
            saveAsset: jest.fn(),
            getAssetById: jest.fn(),
            getAllAssets: jest.fn(),
            generateIncrementalId: jest.fn()
        } as any;

        useCases = new CatalogUseCases(mockRepository);
    });

    describe('createCategory', () => {
        it('should create and save a new category', async () => {
            const result = await useCases.createCategory('Laptop', { fields: [] });

            expect(result).toBeInstanceOf(Category);
            expect(result.name).toBe('Laptop');
            expect(mockRepository.saveCategory).toHaveBeenCalledWith(result);
        });
    });

    describe('createAsset', () => {
        it('should create a new asset when category exists', async () => {
            const mockCategory = new Category({ id: 1, name: 'Laptop', schemaDefinition: { fields: [] } as any });
            mockRepository.getCategoryById.mockResolvedValue(mockCategory);

            const result = await useCases.createAsset('asset-1', 1, 'SN123', { brand: 'Dell' }, new Date(), 12, 3);

            expect(result).toBeInstanceOf(Asset);
            expect(result.id).toBe('asset-1');
            expect(result.status).toBe('AVAILABLE');
            expect(mockRepository.saveAsset).toHaveBeenCalledWith(result);
        });

        it('should throw an error if category is not found', async () => {
            mockRepository.getCategoryById.mockResolvedValue(null);

            await expect(useCases.createAsset('asset-1', 999, 'SN123', {}))
                .rejects.toThrow('La categoría con ID 999 no existe.');
        });
    });

    describe('changeAssetStatus', () => {
        it('should change status and save asset if found', async () => {
            const asset = new Asset({ id: 'asset-1', categoryId: 1, serial: 'SN123', status: 'AVAILABLE', dynamicAttributes: {} });
            mockRepository.getAssetById.mockResolvedValue(asset);

            const result = await useCases.changeAssetStatus('asset-1', 'IN_USE');

            expect(result.status).toBe('IN_USE');
            expect(mockRepository.saveAsset).toHaveBeenCalledWith(asset);
        });

        it('should throw an error if asset not found', async () => {
            mockRepository.getAssetById.mockResolvedValue(null);

            await expect(useCases.changeAssetStatus('invalid-asset', 'IN_USE'))
                .rejects.toThrow('El activo con ID invalid-asset no fue encontrado.');
        });
    });
});
