import { Category } from '../Category';

describe('Category Domain Entity', () => {
    const mockSchema = {
        required: ['macAddress']
    };

    it('debe crear una categoría correctamente', () => {
        const category = new Category({
            id: 'laptop',
            name: 'Laptop',
            schemaDefinition: mockSchema
        });

        expect(category.id).toBe('laptop');
        expect(category.name).toBe('Laptop');
        expect(category.schemaDefinition).toEqual(mockSchema);
    });

    it('debe arrojar error si se intenta crear sin ID o Nombre', () => {
        expect(() => {
            new Category({ id: 'laptop', name: '', schemaDefinition: {} });
        }).toThrow('Category name cannot be empty');
    });

    describe('Validación de Atributos Dinámicos', () => {
        const category = new Category({
            id: 'laptop',
            name: 'Laptop',
            schemaDefinition: mockSchema
        });

        it('debe pasar la validación con un payload válido', () => {
            const attributes = {
                macAddress: '00:1B:44:11:3A:B7',
                ram: '16GB',
                processor: 'Intel i7'
            };

            const errors = category.validateDynamicAttributes(attributes);
            expect(errors).toHaveLength(0);
        });

        it('debe retornar error si falta un atributo requerido', () => {
            const attributes = {
                ram: '16GB'
            };

            const errors = category.validateDynamicAttributes(attributes);
            expect(errors).toContain('Falta el atributo requerido: macAddress');
        });
    });
});
