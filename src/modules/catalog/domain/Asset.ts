import { Category } from './Category';

export type AssetStatus = 'AVAILABLE' | 'IN_USE' | 'IN_MAINTENANCE' | 'PENDING_INSPECTION' | 'RETIRED';

export interface AssetProps {
    id: string;
    categoryId: number;
    serial?: string;
    status: AssetStatus;
    dynamicAttributes: Record<string, any>;
    purchaseDate?: Date;
    warrantyMonths?: number;
    depreciationYears?: number;
    purchasePrice?: number;
}

export class Asset {
    private props: AssetProps;

    constructor(props: AssetProps, category?: Category) {
        // Reglas de Negocio Centrales
        
        
        this.props = props;
        
        // Si se inyecta la Categoría en la creación, validar el payload dinámico (Clean Architecture)
        if (category) {
            this.validateAgainstCategory(category, props.dynamicAttributes);
        }
    }

    get id(): string { return this.props.id; }
    get categoryId(): number { return this.props.categoryId; }
    get serial(): string | undefined { return this.props.serial; }
    get status(): AssetStatus { return this.props.status; }
    get dynamicAttributes(): Record<string, any> { return this.props.dynamicAttributes; }
    get purchaseDate(): Date | undefined { return this.props.purchaseDate; }
    get warrantyMonths(): number | undefined { return this.props.warrantyMonths; }
    get depreciationYears(): number | undefined { return this.props.depreciationYears; }
    get purchasePrice(): number | undefined { return this.props.purchasePrice; }

    public updateAttributes(newAttributes: Record<string, any>, category: Category): void {
        this.validateAgainstCategory(category, newAttributes);
        this.props.dynamicAttributes = { ...this.props.dynamicAttributes, ...newAttributes };
    }

    public updateBaseData(serial?: string, purchaseDate?: Date, warrantyMonths?: number, depreciationYears?: number, purchasePrice?: number): void {
        
        this.props.serial = serial;
        this.props.purchaseDate = purchaseDate;
        this.props.warrantyMonths = warrantyMonths;
        this.props.depreciationYears = depreciationYears;
        this.props.purchasePrice = purchasePrice;
    }

    public changeStatus(newStatus: AssetStatus): void {
        this.props.status = newStatus;
    }

    private validateAgainstCategory(category: Category, attributes: Record<string, any>): void {
        if (category.id !== this.props.categoryId) {
            throw new Error('El activo no coincide con la categoría provista');
        }
        const validationErrors = category.validateDynamicAttributes(attributes);
        if (validationErrors.length > 0) {
            throw new Error(`Error de Validación de Atributos Dinámicos: ${validationErrors.join(', ')}`);
        }
    }
}
