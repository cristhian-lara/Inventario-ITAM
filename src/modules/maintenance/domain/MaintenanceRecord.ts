import { MaintenanceType, MaintenanceStatus } from './MaintenanceTypes';

export interface MaintenanceRecordProps {
    id: string;
    assetId: string;
    type: MaintenanceType;
    status: MaintenanceStatus;
    scheduledDate: Date;
    executionDate?: Date;
    reason?: string;
    notes?: string;
    collaboratorInTurnId?: string;
    collaboratorInTurnName?: string;
    signatureToken?: string;
    signedAt?: Date;
    signatureMetadata?: any;
    pdfUrl?: string;
}

export class MaintenanceRecord {
    private props: MaintenanceRecordProps;

    constructor(props: MaintenanceRecordProps) {
        if (!props.id || !props.assetId) {
            throw new Error('ID y AssetID son obligatorios para un registro de mantenimiento');
        }
        this.props = props;
    }

    get id(): string { return this.props.id; }
    get assetId(): string { return this.props.assetId; }
    get type(): MaintenanceType { return this.props.type; }
    get status(): MaintenanceStatus { return this.props.status; }
    get scheduledDate(): Date { return this.props.scheduledDate; }
    get executionDate(): Date | undefined { return this.props.executionDate; }
    get reason(): string | undefined { return this.props.reason; }
    get notes(): string | undefined { return this.props.notes; }
    get collaboratorInTurnId(): string | undefined { return this.props.collaboratorInTurnId; }
    get collaboratorInTurnName(): string | undefined { return this.props.collaboratorInTurnName; }
    get signatureToken(): string | undefined { return this.props.signatureToken; }
    get signedAt(): Date | undefined { return this.props.signedAt; }
    get signatureMetadata(): any { return this.props.signatureMetadata; }
    get pdfUrl(): string | undefined { return this.props.pdfUrl; }

    public startMaintenance(reason?: string): void {
        if (this.props.status === 'COMPLETED' || this.props.status === 'CANCELLED') {
            throw new Error('No se puede iniciar un mantenimiento cerrado');
        }
        this.props.status = 'IN_PROGRESS';
        if (reason) this.props.reason = reason;
    }

    public completeMaintenance(executionDate: Date, notes?: string): MaintenanceRecord {
        if (this.props.status !== 'IN_PROGRESS' && this.props.status !== 'SCHEDULED') {
            throw new Error('Solo se pueden completar mantenimientos en progreso o programados');
        }
        this.props.status = 'COMPLETED';
        this.props.executionDate = executionDate;
        if (notes) this.props.notes = notes;

        // Regla: Se crea un nuevo registro preventivo para +1 año
        const nextScheduledDate = new Date(executionDate);
        nextScheduledDate.setFullYear(nextScheduledDate.getFullYear() + 1);

        return new MaintenanceRecord({
            id: `maint-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            assetId: this.props.assetId,
            type: 'PREVENTIVE',
            status: 'SCHEDULED',
            scheduledDate: nextScheduledDate
        });
    }

    public generateSignatureToken(generator: (id: string) => string): string {
        if (this.props.status !== 'COMPLETED') {
            throw new Error('Solo los mantenimientos completados pueden ser firmados.');
        }
        if (!this.props.collaboratorInTurnId) {
            throw new Error('No hay usuario en turno para firmar este mantenimiento.');
        }
        this.props.signatureToken = generator(this.props.id);
        return this.props.signatureToken;
    }

    public signMaintenance(token: string, metadata: any): void {
        if (this.props.status !== 'COMPLETED') {
            throw new Error('El mantenimiento no está en estado completado.');
        }
        if (this.props.signatureToken !== token) {
            throw new Error('Token de firma inválido.');
        }
        if (this.props.signedAt) {
            throw new Error('El acta de mantenimiento ya ha sido firmada.');
        }
        this.props.signedAt = new Date();
        this.props.signatureMetadata = metadata;
    }

    public updatePdfUrl(url: string): void {
        this.props.pdfUrl = url;
    }

    public cancelMaintenance(notes?: string): void {
        this.props.status = 'CANCELLED';
        if (notes) this.props.notes = notes;
    }
}
