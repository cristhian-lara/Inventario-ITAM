export interface AssignmentDocumentData {
    actType: 'ASSIGNMENT' | 'RETURN';
    assignmentId: string;
    collaboratorName: string;
    collaboratorEmail: string;
    department: string;
    ceco?: string;
    sede?: string;
    assetId: string;
    assetType: string; // Category Name
    assetBrand?: string;
    assetHostname?: string;
    assetVersionOs?: string;
    assetSerial: string;
    assetModel: string;
    assetMac: string;
    assetProcessor: string;
    assetRam: string;
    assetStorage: string;
    requiresPlacaIkusi?: boolean; // Added for peripherals logic
    ipAddress: string;
    timestamp: Date;
    legalTextOverride?: string;
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
