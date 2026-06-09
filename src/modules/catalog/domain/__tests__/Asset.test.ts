import { Asset } from '../Asset';
import { Category } from '../Category';

describe('Asset Domain Entity', () => {
    const mockCategory = new Category({
        id: 'laptop',
        name: 'Laptop',
        schemaDefinition: {
            required: ['macAddress']
        }
    });

    it('debe crear un activo correctamente sin inyectar categoría (sin validación dinámica)', () => {
        const asset = new Asset({
            id: 'asset-1',
            categoryId: 'laptop',
            serial: 'SN-12345',
            status: 'AVAILABLE',
            dynamicAttributes: { macAddress: '00:1B:44:11:3A:B7' }
        });

        expect(asset.id).toBe('asset-1');
        expect(asset.serial).toBe('SN-12345');
        expect(asset.status).toBe('AVAILABLE');
    });

    it('debe crear un activo y validarlo si se inyecta la categoría', () => {
        const asset = new Asset({
            id: 'asset-1',
            categoryId: 'laptop',
            serial: 'SN-12345',
            status: 'AVAILABLE',
            dynamicAttributes: { macAddress: '00:1B:44:11:3A:B7' }
        }, mockCategory);

        expect(asset.id).toBe('asset-1');
    });

    it('debe arrojar error si el serial está vacío', () => {
        expect(() => {
            new Asset({
                id: 'asset-1',
                categoryId: 'laptop',
                serial: '',
                status: 'AVAILABLE',
                dynamicAttributes: {}
            });
        }).toThrow('El número de serial del activo no puede estar vacío');
    });

    it('debe arrojar error si la validación contra la categoría falla', () => {
        expect(() => {
            new Asset({
                id: 'asset-1',
                categoryId: 'laptop',
                serial: 'SN-12345',
                status: 'AVAILABLE',
                dynamicAttributes: { ram: '16GB' } // macAddress es requerido
            }, mockCategory);
        }).toThrow('Error de Validación de Atributos Dinámicos: Falta el atributo requerido: macAddress');
    });

    it('debe arrojar error si se intenta validar contra una categoría con ID diferente', () => {
        const differentCategory = new Category({
            id: 'monitor',
            name: 'Monitor',
            schemaDefinition: {}
        });

        expect(() => {
            new Asset({
                id: 'asset-1',
                categoryId: 'laptop',
                serial: 'SN-12345',
                status: 'AVAILABLE',
                dynamicAttributes: {}
            }, differentCategory);
        }).toThrow('El activo no coincide con la categoría provista');
    });

    it('debe cambiar el estado del activo correctamente', () => {
        const asset = new Asset({
            id: 'asset-1',
            categoryId: 'laptop',
            serial: 'SN-12345',
            status: 'AVAILABLE',
            dynamicAttributes: {}
        });

        asset.changeStatus('IN_USE');
        expect(asset.status).toBe('IN_USE');
    });

    it('debe actualizar los atributos dinámicos validando con la categoría', () => {
        const asset = new Asset({
            id: 'asset-1',
            categoryId: 'laptop',
            serial: 'SN-12345',
            status: 'AVAILABLE',
            dynamicAttributes: { macAddress: 'AA:BB:CC:DD' }
        }, mockCategory);

        asset.updateAttributes({ macAddress: '11:22:33:44' }, mockCategory);
        expect(asset.dynamicAttributes.macAddress).toBe('11:22:33:44');
    });
});
