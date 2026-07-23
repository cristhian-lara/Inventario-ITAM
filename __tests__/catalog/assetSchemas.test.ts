import { createAssetSchema, updateAssetSchema } from '../../src/api/routes/schemas/asset.schemas';

/**
 * El formulario reenvía el activo completo al editar, incluidos los campos
 * opcionales que están vacíos. Antes eso devolvía 400 "Datos inválidos" y el
 * usuario no podía corregir, por ejemplo, el modelo de un periférico.
 */
describe('Schemas de activos', () => {
    describe('updateAssetSchema', () => {
        it('acepta la edición de un periférico con todos los opcionales vacíos', () => {
            const result = updateAssetSchema.safeParse({
                serial: 'N/A',
                dynamicAttributes: { Marca: 'esenses', Tipo: 'Base para PC', Serial: 'N/A', Modelo: 'K-718' },
                purchaseDate: '',
                vendorName: '',
                internalBuyer: ''
            });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.purchaseDate).toBeUndefined();
                expect(result.data.dynamicAttributes).toEqual({
                    Marca: 'esenses', Tipo: 'Base para PC', Serial: 'N/A', Modelo: 'K-718'
                });
            }
        });

        it('acepta serial nulo (activo que nunca tuvo serial en la columna base)', () => {
            const result = updateAssetSchema.safeParse({ serial: null, dynamicAttributes: {} });
            expect(result.success).toBe(true);
        });

        it('trata los numéricos vacíos como ausentes, no como cero', () => {
            const result = updateAssetSchema.safeParse({
                warrantyMonths: '', depreciationYears: '', purchasePrice: ''
            });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.warrantyMonths).toBeUndefined();
                expect(result.data.depreciationYears).toBeUndefined();
                expect(result.data.purchasePrice).toBeUndefined();
            }
        });

        it('conserva una fecha de compra válida', () => {
            const result = updateAssetSchema.safeParse({ purchaseDate: '2026-07-23' });
            expect(result.success).toBe(true);
            if (result.success) expect(result.data.purchaseDate).toBe('2026-07-23');
        });

        it('sigue rechazando una fecha con formato inválido', () => {
            const result = updateAssetSchema.safeParse({ purchaseDate: '23/07/2026' });
            expect(result.success).toBe(false);
        });
    });

    describe('createAssetSchema', () => {
        it('permite crear un periférico sin ID: lo asigna el dominio', () => {
            const result = createAssetSchema.safeParse({
                categoryId: 7,
                dynamicAttributes: { Marca: 'Logitech', Tipo: 'Mouse' }
            });
            expect(result.success).toBe(true);
            if (result.success) expect(result.data.id).toBe('');
        });

        it('exige categoryId numérico', () => {
            const result = createAssetSchema.safeParse({ categoryId: 'periféricos' });
            expect(result.success).toBe(false);
        });
    });
});
