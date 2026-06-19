import { Category, CategoryProps } from '../Category';
import { Asset, AssetProps } from '../Asset';

describe('Catalog Domain Rules', () => {
    
    describe('Category', () => {
        it('debería arrojar error si el nombre está vacío', () => {
            const props: CategoryProps = {
                id: 1,
                name: '',
                schemaDefinition: { fields: [] } as any
            };
            expect(() => new Category(props)).toThrow('Category name cannot be empty');
        });

        it('debería validar campos requeridos en base al schema', () => {
            const category = new Category({
                id: 2,
                name: 'Laptop',
                schemaDefinition: {
                    fields: [
                        { name: 'ram', type: 'text', isRequired: true },
                        { name: 'processor', type: 'text', isRequired: true }
                    ]
                } as any
            });

            // Faltan campos
            const errors = category.validateDynamicAttributes({ color: 'Black' });
            expect(errors.length).toBe(2);
            expect(errors).toContain('Falta el atributo requerido: ram');

            // Campos completos
            const valid = category.validateDynamicAttributes({ ram: '16GB', processor: 'i7' });
            expect(valid.length).toBe(0);
        });
    });

    describe('Asset', () => {
        const mockCategory = new Category({
            id: 1,
            name: 'Laptop',
            schemaDefinition: { fields: [{ name: 'macAddress', type: 'text', isRequired: true }] } as any
        });

        it('debería fallar la validación al crear un Activo con atributos dinámicos inválidos', () => {
            const props: AssetProps = {
                id: 'asset-1',
                categoryId: 1,
                serial: 'SN12345',
                status: 'AVAILABLE',
                dynamicAttributes: { wrongField: 'X' }
            };

            expect(() => new Asset(props, mockCategory)).toThrow(/Error de Validación de Atributos Dinámicos: Falta el atributo requerido: macAddress/);
        });

        it('debería crear el Activo correctamente con atributos dinámicos válidos', () => {
            const props: AssetProps = {
                id: 'asset-2',
                categoryId: 1,
                serial: 'SN999',
                status: 'AVAILABLE',
                dynamicAttributes: { macAddress: '00:1B:44:11:3A:B7' }
            };

            const asset = new Asset(props, mockCategory);
            expect(asset.id).toBe('asset-2');
            expect(asset.dynamicAttributes.macAddress).toBe('00:1B:44:11:3A:B7');
        });
    });
});
