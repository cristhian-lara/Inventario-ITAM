import { z } from 'zod';

/**
 * Un formulario que no diligencia un campo opcional manda '' o null, no lo omite.
 * Sin esto la edición de un activo fallaba con "Datos inválidos" solo por
 * reenviar los campos vacíos que ya venían vacíos (típicamente purchaseDate ''
 * contra el regex, y serial null contra z.string()).
 */
const vacioComoAusente = <T extends z.ZodType>(schema: T) =>
    z.preprocess(v => (v === '' || v === null ? undefined : v), schema.optional());

export const createAssetSchema = z.object({
    // Opcional a nivel de transporte: las categorías sin Placa Ikusi generan el
    // ID en el dominio. La obligatoriedad la impone CatalogUseCases según la categoría.
    id: z.string().optional().default(''),
    categoryId: z.coerce.number({ message: 'categoryId debe ser numérico' }),
    serial: vacioComoAusente(z.string()),
    dynamicAttributes: z.record(z.string(), z.any()).optional().default({}),
    purchaseDate: vacioComoAusente(z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'purchaseDate debe tener formato YYYY-MM-DD')),
    warrantyMonths: vacioComoAusente(z.coerce.number()),
    depreciationYears: vacioComoAusente(z.coerce.number()),
    purchasePrice: vacioComoAusente(z.coerce.number()),
    vendorName: vacioComoAusente(z.string()),
    internalBuyer: vacioComoAusente(z.string()),
});

/**
 * La edición reenvía el activo completo tal como lo cargó el formulario, así que
 * todo es opcional: los campos obligatorios de verdad son los que cada categoría
 * define en su esquema, y esos los valida el dominio (Category.validateDynamicAttributes).
 */
export const updateAssetSchema = createAssetSchema.omit({ id: true, categoryId: true }).partial();
