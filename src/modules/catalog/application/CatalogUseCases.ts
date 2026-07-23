import { Asset, AssetStatus } from '../domain/Asset';
import { Category } from '../domain/Category';
import { ICatalogRepository } from '../domain/ICatalogRepository';

export class CatalogUseCases {
    constructor(private readonly repository: ICatalogRepository) {}

    async createCategory(name: string, schema: Record<string, any>): Promise<Category> {
        const category = new Category({ name, schemaDefinition: schema as any });
        await this.repository.saveCategory(category);
        return category;
    }

    async getAllCategories(): Promise<Category[]> {
        return this.repository.getAllCategories();
    }

    async updateCategory(id: number, name: string, schema: Record<string, any>): Promise<Category> {
        const existing = await this.repository.getCategoryById(id);
        if (!existing) {
            throw new Error(`La categoría con ID ${id} no existe.`);
        }
        const updatedCategory = new Category({ id, name, schemaDefinition: schema as any });
        await this.repository.saveCategory(updatedCategory);
        return updatedCategory;
    }

    /**
     * Decide el ID de un activo nuevo según su categoría:
     *  - Con Placa Ikusi: es obligatoria y se respeta tal cual.
     *  - Sin Placa Ikusi (Periféricos): el ID lo asigna SIEMPRE el sistema
     *    (PER001, PER002...). El único ID externo que se acepta es uno que ya
     *    venga con el prefijo de la categoría, para que reimportar un Excel de
     *    periféricos no duplique los que ya existen.
     */
    private async resolveNewAssetId(providedId: string | undefined, category: Category): Promise<string> {
        const trimmed = (providedId || '').trim();
        const requiresPlaca = category.schemaDefinition.requiresPlacaIkusi !== false; // defaults to true

        if (requiresPlaca) {
            if (!trimmed) throw new Error('La Placa Ikusi es obligatoria para esta categoría.');
            return trimmed;
        }

        const prefix: string | undefined = category.schemaDefinition.idPrefix?.trim() || undefined;
        if (prefix && new RegExp(`^${prefix}\\d+$`).test(trimmed)) {
            return trimmed;
        }
        return this.repository.generateIncrementalId(category.id as number, prefix);
    }

    async createAsset(id: string, categoryId: number, serial: string, dynamicAttributes: Record<string, any>, purchaseDate?: Date, warrantyMonths?: number, depreciationYears?: number, purchasePrice?: number, vendorName?: string, internalBuyer?: string): Promise<Asset> {
        const category = await this.repository.getCategoryById(categoryId);
        if (!category) {
            throw new Error(`La categoría con ID ${categoryId} no existe.`);
        }

        const assetId = await this.resolveNewAssetId(id, category);

        const asset = new Asset({
            id: assetId,
            categoryId,
            serial,
            status: 'AVAILABLE',
            dynamicAttributes,
            purchaseDate,
            warrantyMonths,
            depreciationYears,
            purchasePrice,
            vendorName,
            internalBuyer
        }, category);

        await this.repository.saveAsset(asset);
        return asset;
    }

    /**
     * Baja definitiva de un activo con trazabilidad de auditoría
     * (motivo, autorizado por, referencia del borrado Blancco).
     */
    async decommissionAsset(assetId: string, info: { reason: string; authorizedBy: string; blanccoReportId?: string; notes?: string }): Promise<Asset> {
        const asset = await this.repository.getAssetById(assetId);
        if (!asset) throw new Error(`El activo con ID ${assetId} no existe.`);

        asset.decommission(info);
        await this.repository.saveAsset(asset);
        return asset;
    }

    async getAllAssets(): Promise<Asset[]> {
        return this.repository.getAllAssets();
    }

    async getAssetsPaginated(page: number, limit: number): Promise<{ items: Asset[]; total: number }> {
        return this.repository.getAssetsPaginated(page, limit);
    }

    async getAssetById(assetId: string): Promise<Asset | null> {
        return this.repository.getAssetById(assetId);
    }

    async updateAsset(assetId: string, serial: string | undefined, dynamicAttributes: Record<string, any>, purchaseDate?: Date, warrantyMonths?: number, depreciationYears?: number, purchasePrice?: number, vendorName?: string, internalBuyer?: string): Promise<Asset> {
        const asset = await this.repository.getAssetById(assetId);
        if (!asset) throw new Error(`El activo con ID ${assetId} no existe.`);

        const category = await this.repository.getCategoryById(asset.categoryId);
        if (!category) throw new Error('Categoría no encontrada');

        asset.updateBaseData(serial, purchaseDate, warrantyMonths, depreciationYears, purchasePrice, vendorName, internalBuyer);
        asset.updateAttributes(dynamicAttributes, category);

        await this.repository.saveAsset(asset);
        return asset;
    }

    /**
     * Corrige manualmente la Placa Ikusi de un activo (caso de equipos que,
     * por malas prácticas previas, quedaron dados de alta sin placa asignada).
     * Propaga el cambio a assignments/maintenances/hardware_upgrades para no
     * romper el historial existente.
     */
    async renameAssetPlate(oldId: string, newId: string): Promise<Asset> {
        const trimmedNewId = newId?.trim();
        if (!trimmedNewId) {
            throw new Error('La nueva Placa Ikusi no puede estar vacía.');
        }
        if (trimmedNewId === oldId) {
            throw new Error('La nueva Placa Ikusi debe ser diferente a la actual.');
        }

        const asset = await this.repository.getAssetById(oldId);
        if (!asset) throw new Error(`El activo con ID ${oldId} no existe.`);

        const conflicting = await this.repository.getAssetById(trimmedNewId);
        if (conflicting) throw new Error(`Ya existe un activo con la placa ${trimmedNewId}.`);

        await this.repository.renameAssetPlate(oldId, trimmedNewId);

        const renamed = await this.repository.getAssetById(trimmedNewId);
        if (!renamed) throw new Error('No se pudo confirmar el renombrado del activo.');

        return renamed;
    }

    async changeAssetStatus(assetId: string, newStatus: AssetStatus, reason?: string): Promise<Asset> {
        const asset = await this.repository.getAssetById(assetId);
        if (!asset) throw new Error(`El activo con ID ${assetId} no fue encontrado.`);
        
        asset.changeStatus(newStatus);
        
        if (newStatus === 'RETIRED' && reason) {
            asset.dynamicAttributes['Motivo de Baja'] = reason;
            asset.dynamicAttributes['Fecha de Baja'] = new Date().toISOString().split('T')[0];
        }

        await this.repository.saveAsset(asset);
        return asset;
    }

    async importAssets(records: any[]): Promise<{ successful: number; failed: number; errors: string[]; created: ImportedAssetRef[] }> {
        let successful = 0;
        let failed = 0;
        const errors: string[] = [];
        const created: ImportedAssetRef[] = [];

        const allCategories = await this.repository.getAllCategories();

        for (const [index, record] of records.entries()) {
            try {
                // Lectura de columnas tolerante a mayúsculas/minúsculas y espacios:
                // así "Placa IKUSI", "placa ikusi", "Placa Ikusi", etc. se reconocen
                // por igual sin depender del formato exacto del encabezado del Excel.
                const normalizedIndex: Record<string, string> = {};
                for (const key of Object.keys(record)) {
                    normalizedIndex[key.toLowerCase().trim()] = key;
                }
                const consumedKeys = new Set<string>();
                const pick = (...candidates: string[]): any => {
                    let value: any = undefined;
                    for (const cand of candidates) {
                        const realKey = normalizedIndex[cand.toLowerCase().trim()];
                        if (realKey === undefined) continue;
                        consumedKeys.add(realKey); // la columna es "conocida": no va a atributos dinámicos
                        if (value === undefined && record[realKey] !== undefined && record[realKey] !== '') {
                            value = record[realKey];
                        }
                    }
                    return value;
                };

                // Known columns
                const rawId = pick('Placa Ikusi', 'PlacaIkusi', 'ID', 'id') || '';
                const categoryRaw = pick('Categoría', 'Categoria', 'Category', 'category', 'categoryId');
                const serial = pick('Serial', 'SerialNumber');
                const purchaseDateRaw = pick('Fecha de Compra', 'PurchaseDate', 'purchaseDate');
                const warrantyMonthsRaw = pick('Meses Garantía', 'WarrantyMonths', 'warrantyMonths');
                const depreciationYearsRaw = pick('Años Depreciación', 'DepreciationYears', 'depreciationYears');
                const vendorNameRaw = pick('Proveedor', 'Vendor', 'vendorName');
                const internalBuyerRaw = pick('Comprador Interno', 'InternalBuyer', 'internalBuyer');
                const purchasePriceRaw = pick('Precio Compra', 'PurchasePrice', 'purchasePrice');
                // Columnas de asignación: no forman parte del activo; la ruta las usa
                // para asignar el activo al colaborador tras crearlo.
                const assigneeEmailRaw = pick('Asignado a', 'AsignadoA', 'Asignado', 'Assignee', 'AssignedTo');
                const assignmentDateRaw = pick('Fecha de Asignación', 'Fecha de Asignacion', 'FechaAsignacion', 'AssignmentDate');
                void purchasePriceRaw; // reservado: la creación de activo aún no recibe precio en el import

                if (!categoryRaw || !serial) {
                    throw new Error('Faltan campos obligatorios (Categoría, Serial)');
                }

                const category = allCategories.find(c => c.id === Number(categoryRaw) || c.name.toLowerCase() === String(categoryRaw).toLowerCase().trim());
                if (!category) {
                    throw new Error(`La categoría '${categoryRaw}' no existe.`);
                }

                // Dynamic attributes: todo lo que no sea una columna conocida
                // (los campos propios de la categoría llegan aquí y se emparejan abajo).
                const dynamicAttributes: Record<string, any> = {};
                for (const key of Object.keys(record)) {
                    if (!consumedKeys.has(key)) {
                        dynamicAttributes[key] = record[key];
                    }
                }

                // Match with category schema fields
                if (category.schemaDefinition && category.schemaDefinition.fields) {
                    for (const field of category.schemaDefinition.fields) {
                        const matchedKey = Object.keys(dynamicAttributes).find(k => 
                            k.toLowerCase().trim() === field.name.toLowerCase().trim() ||
                            k.toLowerCase().replace('fehca', 'fecha') === field.name.toLowerCase().trim()
                        );

                        if (matchedKey) {
                            let val = dynamicAttributes[matchedKey];
                            
                            if (matchedKey !== field.name) {
                                delete dynamicAttributes[matchedKey];
                            }

                            if (field.type === 'select' && field.options) {
                                const strVal = String(val).trim().toLowerCase();
                                const optionMatch = field.options.find((opt: string) => String(opt).trim().toLowerCase() === strVal);
                                if (optionMatch) {
                                    val = optionMatch;
                                } else {
                                    val = String(val).trim();
                                }
                            } else if (val instanceof Date) {
                                val = val.toISOString().split('T')[0];
                            }

                            dynamicAttributes[field.name] = val;
                        }
                    }
                }

                // parse dates and numbers safely
                let purchaseDate: Date | undefined = undefined;
                if (purchaseDateRaw) {
                    // Excel might return a number for dates, or a string
                    if (typeof purchaseDateRaw === 'number') {
                        purchaseDate = new Date((purchaseDateRaw - (25567 + 2)) * 86400 * 1000); // Excel date conversion
                    } else {
                        purchaseDate = new Date(purchaseDateRaw);
                    }
                }

                const warrantyMonths = warrantyMonthsRaw ? parseInt(String(warrantyMonthsRaw), 10) : undefined;
                const depreciationYears = depreciationYearsRaw ? parseInt(String(depreciationYearsRaw), 10) : undefined;

                // Idempotencia: si el activo ya existe (reimportación), se ACTUALIZA
                // preservando su estado actual (En Uso, En Mantenimiento, etc.) — recrearlo
                // con createAsset lo resetearía a "Disponible". La validación y la categoría
                // se toman SIEMPRE de la fila del Excel (la categoría del archivo manda), no
                // de la categoría previamente guardada; así un Computador no se valida contra
                // las reglas de Monitores/Periféricos.
                const trimmedId = String(rawId).trim();
                const existingAsset = trimmedId ? await this.repository.getAssetById(trimmedId) : null;

                let createdAsset: Asset;
                if (existingAsset) {
                    const updated = new Asset({
                        id: trimmedId,
                        categoryId: category.id as number,
                        serial: String(serial).trim(),
                        status: existingAsset.status, // preserva En Uso / En Mantenimiento / etc.
                        dynamicAttributes,
                        purchaseDate,
                        warrantyMonths,
                        depreciationYears,
                        purchasePrice: existingAsset.purchasePrice,
                        vendorName: vendorNameRaw ? String(vendorNameRaw).trim() : existingAsset.vendorName,
                        internalBuyer: internalBuyerRaw ? String(internalBuyerRaw).trim() : existingAsset.internalBuyer,
                        disposal: existingAsset.disposal
                    }, category); // valida contra la categoría de la FILA
                    await this.repository.saveAsset(updated);
                    createdAsset = updated;
                } else {
                    createdAsset = await this.createAsset(
                        trimmedId,
                        category.id as number,
                        String(serial).trim(),
                        dynamicAttributes,
                        purchaseDate,
                        warrantyMonths,
                        depreciationYears,
                        undefined,
                        vendorNameRaw ? String(vendorNameRaw).trim() : undefined,
                        internalBuyerRaw ? String(internalBuyerRaw).trim() : undefined
                    );
                }

                // Fecha de asignación normalizada a 'YYYY-MM-DD' (Excel puede entregar
                // un Date, un serial numérico o un string dd/mm/yyyy).
                let assignmentDate: string | undefined = undefined;
                if (assignmentDateRaw instanceof Date) {
                    assignmentDate = assignmentDateRaw.toISOString().split('T')[0];
                } else if (typeof assignmentDateRaw === 'number') {
                    assignmentDate = new Date((assignmentDateRaw - (25567 + 2)) * 86400 * 1000).toISOString().split('T')[0];
                } else if (typeof assignmentDateRaw === 'string' && assignmentDateRaw.trim()) {
                    const parts = assignmentDateRaw.trim().split('/');
                    assignmentDate = parts.length === 3
                        ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
                        : assignmentDateRaw.trim();
                }

                created.push({
                    assetId: createdAsset.id,
                    assigneeEmail: assigneeEmailRaw ? String(assigneeEmailRaw).trim() : undefined,
                    assignmentDate
                });

                successful++;
            } catch (error: any) {
                failed++;
                errors.push(`Fila ${index + 2}: ${error.message}`);
            }
        }

        return { successful, failed, errors, created };
    }
}

/** Referencia mínima de un activo creado por importación, para la fase de asignación posterior. */
export interface ImportedAssetRef {
    assetId: string;
    assigneeEmail?: string;
    assignmentDate?: string;
}
