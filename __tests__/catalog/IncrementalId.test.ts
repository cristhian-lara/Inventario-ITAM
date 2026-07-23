import { InMemoryCatalogRepository } from '../../src/modules/catalog/infrastructure/InMemoryCatalogRepository';
import { CatalogUseCases } from '../../src/modules/catalog/application/CatalogUseCases';
import { Category } from '../../src/modules/catalog/domain/Category';

/**
 * El consecutivo con prefijo debe salir del MAYOR sufijo existente, no de un
 * conteo: contar repite un número ya usado en cuanto se da de baja un activo y
 * el nuevo ID choca contra la llave primaria.
 */
describe('IDs autoincrementales con prefijo', () => {
    let repo: InMemoryCatalogRepository;
    let useCases: CatalogUseCases;

    const perifericos = new Category({
        id: 7,
        name: 'Periféricos',
        schemaDefinition: { requiresPlacaIkusi: false, idPrefix: 'PER', fields: [] } as any
    });

    beforeEach(async () => {
        repo = new InMemoryCatalogRepository();
        useCases = new CatalogUseCases(repo);
        await repo.saveCategory(perifericos);
    });

    it('numera desde 001 cuando la categoría está vacía', async () => {
        const asset = await useCases.createAsset('', 7, 'SN-1', {});
        expect(asset.id).toBe('PER001');
    });

    it('continúa la secuencia en creaciones sucesivas', async () => {
        const ids: string[] = [];
        for (let i = 0; i < 3; i++) {
            ids.push((await useCases.createAsset('', 7, `SN-${i}`, {})).id);
        }
        expect(ids).toEqual(['PER001', 'PER002', 'PER003']);
    });

    it('no reutiliza un número aunque falten activos anteriores en la secuencia', async () => {
        // Estado tras dar de baja PER001: queda un solo activo, pero numerado 002.
        await useCases.createAsset('PER002', 7, 'SN-2', {});

        // Un conteo daría PER002 de nuevo (hay 1 activo) y chocaría contra la PK.
        const siguiente = await useCases.createAsset('', 7, 'SN-3', {});
        expect(siguiente.id).toBe('PER003');
    });

    it('supera los tres dígitos sin truncar ni colisionar', async () => {
        await useCases.createAsset('PER999', 7, 'SN-999', {});
        const siguiente = await useCases.createAsset('', 7, 'SN-1000', {});
        expect(siguiente.id).toBe('PER1000');
    });

    it('ignora activos de otras categorías que no comparten el prefijo', async () => {
        const computadores = new Category({ id: 1, name: 'Computadores', schemaDefinition: { requiresPlacaIkusi: true, fields: [] } as any });
        await repo.saveCategory(computadores);
        await useCases.createAsset('000500', 1, 'SN-PC', {});

        const asset = await useCases.createAsset('', 7, 'SN-1', {});
        expect(asset.id).toBe('PER001');
    });
});
