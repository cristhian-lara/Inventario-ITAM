export interface IMailerService {
    sendAssignmentEmail(to: string, assignmentId: string, token: string): Promise<void>;
    sendReturnEmail(to: string, assignmentId: string, token: string): Promise<void>;
    sendMaintenanceSignatureEmail(to: string, maintenanceId: string, token: string): Promise<void>;
}
