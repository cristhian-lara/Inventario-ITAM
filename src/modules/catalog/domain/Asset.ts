import { Category } from './Category';

export type AssetStatus = 'AVAILABLE' | 'IN_USE' | 'IN_MAINTENANCE' | 'PENDING_INSPECTION' | 'RETIRED';

export interface DisposalInfo {
    reason: string;
    disposalDate: Date | string;
    authorizedBy: string;
    /** Referencia del reporte de borrado seguro en Blancco */
    blanccoReportId?: string;
    notes?: string;
}

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
    /** Proveedor externo al que se le compró el equipo (trazabilidad de auditoría) */
    vendorName?: string;
    /** Comprador interno (colaborador/área) que gestionó la compra (trazabilidad de auditoría) */
    internalBuyer?: string;
    disposal?: DisposalInfo;
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
    get vendorName(): string | undefined { return this.props.vendorName; }
    get internalBuyer(): string | undefined { return this.props.internalBuyer; }
    get disposal(): DisposalInfo | undefined { return this.props.disposal; }

    /**
     * Baja definitiva del activo: requiere motivo y quién autoriza.
     * El borrado seguro de discos se realiza en Blancco; aquí se guarda
     * la referencia del reporte para trazabilidad de auditoría.
     */
    public decommission(info: { reason: string; authorizedBy: string; blanccoReportId?: string; notes?: string }): void {
        if (this.props.status === 'RETIRED') {
            throw new Error('El activo ya se encuentra dado de baja.');
        }
        if (this.props.status === 'IN_USE' || this.props.status === 'PENDING_INSPECTION') {
            throw new Error('No se puede dar de baja un activo asignado o en proceso de firma. Primero gestiona su devolución.');
        }
        if (this.props.status === 'IN_MAINTENANCE') {
            throw new Error('No se puede dar de baja un activo en mantenimiento. Primero finaliza la intervención.');
        }
        if (!info.reason || !info.reason.trim()) {
            throw new Error('El motivo de la baja es obligatorio.');
        }
        this.props.status = 'RETIRED';
        this.props.disposal = {
            reason: info.reason.trim(),
            disposalDate: new Date(),
            authorizedBy: info.authorizedBy,
            blanccoReportId: info.blanccoReportId?.trim() || undefined,
            notes: info.notes?.trim() || undefined
        };
    }

    public updateAttributes(newAttributes: Record<string, any>, category: Category): void {
        this.validateAgainstCategory(category, newAttributes);
        this.props.dynamicAttributes = { ...this.props.dynamicAttributes, ...newAttributes };
    }

    public updateBaseData(serial?: string, purchaseDate?: Date, warrantyMonths?: number, depreciationYears?: number, purchasePrice?: number, vendorName?: string, internalBuyer?: string): void {

        this.props.serial = serial;
        this.props.purchaseDate = purchaseDate;
        this.props.warrantyMonths = warrantyMonths;
        this.props.depreciationYears = depreciationYears;
        this.props.purchasePrice = purchasePrice;
        this.props.vendorName = vendorName;
        this.props.internalBuyer = internalBuyer;
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
