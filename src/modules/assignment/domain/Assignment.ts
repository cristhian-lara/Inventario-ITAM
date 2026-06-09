export type AssignmentStatus = 'PENDING_ACCEPTANCE' | 'ACCEPTED' | 'PENDING_RETURN' | 'RETURNED';

export interface SignatureMetadata {
    ipAddress: string;
    userAgent: string;
    timestamp: Date;
}

export interface AssignmentProps {
    id: string;
    assetId: string;
    collaboratorId: string;
    status: AssignmentStatus;
    startDate: Date;
    endDate?: Date;
    documentPath?: string;
    signatureToken?: string;
    signatureMetadata?: SignatureMetadata;
}

export class Assignment {
    private props: AssignmentProps;

    constructor(props: AssignmentProps) {
        if (!props.assetId || !props.collaboratorId) {
            throw new Error('Asset ID y Collaborator ID son obligatorios');
        }
        this.props = props;
    }

    get id(): string { return this.props.id; }
    get status(): AssignmentStatus { return this.props.status; }
    get assetId(): string { return this.props.assetId; }
    get collaboratorId(): string { return this.props.collaboratorId; }
    get startDate(): Date { return this.props.startDate; }
    get endDate(): Date | undefined { return this.props.endDate; }
    get signatureToken(): string | undefined { return this.props.signatureToken; }
    get signatureMetadata(): SignatureMetadata | undefined { return this.props.signatureMetadata; }

    /**
     * Genera un token y lo asocia a la asignación.
     */
    public generateToken(tokenGenerator: (assignmentId: string) => string): string {
        if (this.props.status !== 'PENDING_ACCEPTANCE' && this.props.status !== 'PENDING_RETURN') {
            throw new Error('Solo se puede generar token para actas pendientes de firma');
        }
        const token = tokenGenerator(this.props.id);
        this.props.signatureToken = token;
        return token;
    }

    /**
     * Valida el token y acepta la asignación.
     */
    public acceptAssignment(token: string, metadata: SignatureMetadata): void {
        if (this.props.status !== 'PENDING_ACCEPTANCE') {
            throw new Error('La asignación no está pendiente de aceptación');
        }
        if (this.props.signatureToken !== token) {
            throw new Error('Token de firma inválido o expirado');
        }
        this.props.status = 'ACCEPTED';
        this.props.signatureMetadata = metadata;
        this.props.signatureToken = undefined; // Consumir el token
    }

    /**
     * Inicia el proceso de devolución.
     */
    public initiateReturn(): void {
        if (this.props.status !== 'ACCEPTED') {
            throw new Error('Solo se puede devolver un activo que fue previamente aceptado');
        }
        this.props.status = 'PENDING_RETURN';
    }

    /**
     * Valida el token y finaliza la devolución.
     */
    public confirmReturn(token: string, metadata: SignatureMetadata): void {
        if (this.props.status !== 'PENDING_RETURN') {
            throw new Error('La asignación no está pendiente de devolución');
        }
        if (this.props.signatureToken !== token) {
            throw new Error('Token de firma de devolución inválido');
        }
        this.props.status = 'RETURNED';
        this.props.endDate = metadata.timestamp;
        this.props.signatureMetadata = metadata;
        this.props.signatureToken = undefined; // Consumir el token
    }

    /**
     * Devolución administrativa forzada sin token del usuario.
     */
    public forceReturn(metadata: SignatureMetadata): void {
        if (this.props.status !== 'ACCEPTED' && this.props.status !== 'PENDING_RETURN') {
            throw new Error('Solo se puede forzar la devolución de un activo en uso');
        }
        this.props.status = 'RETURNED';
        this.props.endDate = metadata.timestamp;
        this.props.signatureMetadata = metadata;
        this.props.signatureToken = undefined;
    }
}
