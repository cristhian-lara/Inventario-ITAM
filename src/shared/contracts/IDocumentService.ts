export interface AssignmentDocumentData {
    actType: 'ASSIGNMENT' | 'RETURN';
    /**
     * Solo aplica cuando actType === 'RETURN':
     * - 'PAZ_Y_SALVO': el colaborador devuelve TODOS sus activos (no le queda ninguno).
     * - 'DEVOLUCION': devolución parcial (le queda al menos un activo asignado).
     * Si se omite, se asume PAZ_Y_SALVO (comportamiento histórico).
     */
    returnMode?: 'PAZ_Y_SALVO' | 'DEVOLUCION';
    assignmentId: string;
    collaboratorName: string;
    collaboratorEmail: string;
    department: string;
    ceco?: string;
    sede?: string;
    assets: {
        assetId: string;
        assetType: string;
        assetBrand?: string;
        assetHostname?: string;
        assetVersionOs?: string;
        assetSerial: string;
        assetModel: string;
        assetMac: string;
        assetProcessor: string;
        assetRam: string;
        assetStorage: string;
        requiresPlacaIkusi?: boolean;
        /** Fecha en que se registró la asignación del activo (startDate). Si se omite, se usa data.timestamp. */
        assignmentDate?: Date | string;
    }[];
    ipAddress: string;
    timestamp: Date;
    legalTextOverride?: string;
    returnReason?: string;
    isForcedSignature?: boolean;
    signatureEmail?: string;
    otherAssignedAssets?: {
        placa: string;
        host: string;
        cat: string;
        marca: string;
        serial: string;
        modelo: string;
    }[];
}

export interface IDocumentService {
    /**
     * Genera un acta de asignación en formato físico (ej. PDF)
     * y devuelve la ruta o URL relativa donde fue almacenada.
     */
    generateAssignmentAct(data: AssignmentDocumentData): Promise<string>;
}
