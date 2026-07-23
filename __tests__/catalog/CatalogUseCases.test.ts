import { CatalogUseCases } from '../../src/modules/catalog/application/CatalogUseCases';
import { ICatalogRepository } from '../../src/modules/catalog/domain/ICatalogRepository';
import { Category } from '../../src/modules/catalog/domain/Category';
import { Asset } from '../../src/modules/catalog/domain/Asset';

describe('CatalogUseCases', () => {
    let useCases: CatalogUseCases;
    let mockRepository: jest.Mocked<ICatalogRepository>;

    beforeEach(() => {
        mockRepository = {
            saveCategory: jest.fn(),
            getCategoryById: jest.fn(),
            getAllCategories: jest.fn(),
            saveAsset: jest.fn(),
            getAssetById: jest.fn(),
            getAllAssets: jest.fn(),
            getAssetsPaginated: jest.fn(),
            generateIncrementalId: jest.fn(),
            renameAssetPlate: jest.fn(),
        };

        useCases = new CatalogUseCases(mockRepository);
    });

    describe('createCategory', () => {
        it('should create and save a new category successfully', async () => {
            const schema = { fields: [] };
            await useCases.createCategory('Computadoras', schema);

            expect(mockRepository.saveCategory).toHaveBeenCalledTimes(1);
            const savedCategory = mockRepository.saveCategory.mock.calls[0][0];
            expect(savedCategory.name).toBe('Computadoras');
            expect(savedCategory.schemaDefinition).toEqual(schema);
        });
    });

    describe('createAsset', () => {
        it('should create an asset when category requires PlacaIkusi and it is provided', async () => {
            const mockCategory = new Category({ id: 1, name: 'Laptops', schemaDefinition: { requiresPlacaIkusi: true } as any });
            mockRepository.getCategoryById.mockResolvedValue(mockCategory);

            const asset = await useCases.createAsset('LAP-001', 1, 'SN123', {});

            expect(asset.id).toBe('LAP-001');
            expect(mockRepository.saveAsset).toHaveBeenCalledWith(asset);
        });

        it('should throw an error when category requires PlacaIkusi but it is not provided', async () => {
            const mockCategory = new Category({ id: 1, name: 'Laptops', schemaDefinition: { requiresPlacaIkusi: true } as any });
            mockRepository.getCategoryById.mockResolvedValue(mockCategory);

            await expect(useCases.createAsset('', 1, 'SN123', {})).rejects.toThrow('La Placa Ikusi es obligatoria para esta categoría.');
        });

        it('should auto-generate ID when category does NOT require PlacaIkusi and ID is not provided', async () => {
            const mockCategory = new Category({ id: 1, name: 'Mouse', schemaDefinition: { requiresPlacaIkusi: false } as any });
            mockRepository.getCategoryById.mockResolvedValue(mockCategory);
            mockRepository.generateIncrementalId.mockResolvedValue('000001');

            const asset = await useCases.createAsset('', 1, 'SN123', {});

            expect(asset.id).toBe('000001');
            expect(mockRepository.generateIncrementalId).toHaveBeenCalledWith(1, undefined);
            expect(mockRepository.saveAsset).toHaveBeenCalledTimes(1);
        });

        it('should generate a prefixed ID when the category defines idPrefix', async () => {
            const mockCategory = new Category({ id: 3, name: 'Periféricos', schemaDefinition: { requiresPlacaIkusi: false, idPrefix: 'PER' } as any });
            mockRepository.getCategoryById.mockResolvedValue(mockCategory);
            mockRepository.generateIncrementalId.mockResolvedValue('PER001');

            const asset = await useCases.createAsset('', 3, 'SN123', {});

            expect(asset.id).toBe('PER001');
            expect(mockRepository.generateIncrementalId).toHaveBeenCalledWith(3, 'PER');
        });

        it('should ignore a manually provided ID for prefixed categories', async () => {
            const mockCategory = new Category({ id: 3, name: 'Periféricos', schemaDefinition: { requiresPlacaIkusi: false, idPrefix: 'PER' } as any });
            mockRepository.getCategoryById.mockResolvedValue(mockCategory);
            mockRepository.generateIncrementalId.mockResolvedValue('PER007');

            const asset = await useCases.createAsset('MI-PLACA-MANUAL', 3, 'SN123', {});

            expect(asset.id).toBe('PER007');
        });

        it('should respect an ID that already matches the prefix (reimportación idempotente)', async () => {
            const mockCategory = new Category({ id: 3, name: 'Periféricos', schemaDefinition: { requiresPlacaIkusi: false, idPrefix: 'PER' } as any });
            mockRepository.getCategoryById.mockResolvedValue(mockCategory);

            const asset = await useCases.createAsset('PER042', 3, 'SN123', {});

            expect(asset.id).toBe('PER042');
            expect(mockRepository.generateIncrementalId).not.toHaveBeenCalled();
        });
    });

    describe('changeAssetStatus', () => {
        it('should change status and save asset', async () => {
            const mockAsset = new Asset({ id: 'LAP-001', categoryId: 1, serial: 'SN123', status: 'AVAILABLE', dynamicAttributes: {} }, new Category({ id: 1, name: 'Test', schemaDefinition: {} as any }));
            mockRepository.getAssetById.mockResolvedValue(mockAsset);

            await useCases.changeAssetStatus('LAP-001', 'IN_USE');

            expect(mockAsset.status).toBe('IN_USE');
            expect(mockRepository.saveAsset).toHaveBeenCalledWith(mockAsset);
        });

        it('should append retirement reason if status is RETIRED', async () => {
            const mockAsset = new Asset({ id: 'LAP-001', categoryId: 1, serial: 'SN123', status: 'AVAILABLE', dynamicAttributes: {} }, new Category({ id: 1, name: 'Test', schemaDefinition: {} as any }));
            mockRepository.getAssetById.mockResolvedValue(mockAsset);

            await useCases.changeAssetStatus('LAP-001', 'RETIRED', 'Daño irreparable');

            expect(mockAsset.status).toBe('RETIRED');
            expect(mockAsset.dynamicAttributes['Motivo de Baja']).toBe('Daño irreparable');
            expect(mockAsset.dynamicAttributes['Fecha de Baja']).toBeDefined();
            expect(mockRepository.saveAsset).toHaveBeenCalledWith(mockAsset);
        });
    });
});
