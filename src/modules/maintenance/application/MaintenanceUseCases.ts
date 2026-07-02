import { IMaintenanceRepository } from '../domain/IMaintenanceRepository';
import { MaintenanceRecord } from '../domain/MaintenanceRecord';
import { MaintenanceStatus, MaintenanceType } from '../domain/MaintenanceTypes';
import { NotificationError, NotificationResult } from '../../../shared/contracts/NotificationError';

// Definimos un contrato para consultar si un activo está asignado (así no acoplamos directamente al repositorio de asignaciones)
export interface IAssetAssignmentService {
    getActiveAssignmentForAsset(assetId: string): Promise<{ collaboratorId: string, collaboratorName: string, collaboratorEmail: string } | null>;
}

export class MaintenanceUseCases {
    constructor(
        private repo: IMaintenanceRepository,
        private assignmentService: IAssetAssignmentService,
        private mailerService?: any // We will type it properly
    ) {}

    async createManualMaintenance(dto: { assetId: string, type: MaintenanceType, scheduledDate: Date, reason?: string }): Promise<MaintenanceRecord> {
        const existingMaintenances = await this.repo.findByAssetId(dto.assetId);
        const activeMaintenance = existingMaintenances.find(m => (m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS') && m.type === dto.type);
        
        if (activeMaintenance) {
            const d = new Date(activeMaintenance.scheduledDate);
            const dateStr = d.toISOString().split('T')[0];
            const typeStr = activeMaintenance.type === 'PREVENTIVE' ? 'Preventivo' : 'Correctivo';
            throw new Error(`El equipo ya cuenta con un mantenimiento programado (${typeStr}) para la fecha ${dateStr}.`);
        }

        const id = `maint-${Date.now()}-${Math.floor(Math.random()*1000)}`;
        
        // Al crear o agendar, si está asignado, guardamos la foto (snapshot) del usuario actual
        const activeAssignment = await this.assignmentService.getActiveAssignmentForAsset(dto.assetId);

        const record = new MaintenanceRecord({
            id,
            assetId: dto.assetId,
            type: dto.type,
            status: 'SCHEDULED',
            scheduledDate: dto.scheduledDate,
            reason: dto.reason,
            collaboratorInTurnId: activeAssignment?.collaboratorId,
            collaboratorInTurnName: activeAssignment?.collaboratorName
        });

        await this.repo.save(record);
        return record;
    }

    async startMaintenance(id: string, startNote?: string): Promise<MaintenanceRecord> {
        const record = await this.repo.findById(id);
        if (!record) throw new Error('Mantenimiento no encontrado');
        
        const existingMaintenances = await this.repo.findByAssetId(record.assetId);
        const inProgressMaintenance = existingMaintenances.find(m => m.status === 'IN_PROGRESS' && m.type === record.type && m.id !== id);
        
        if (inProgressMaintenance) {
            const typeStr = record.type === 'PREVENTIVE' ? 'Preventivo' : 'Correctivo';
            throw new Error(`Ya hay un mantenimiento ${typeStr} en progreso para este activo.`);
        }

        // Actualizamos snapshot por si se asignó a alguien distinto desde que se programó
        const activeAssignment = await this.assignmentService.getActiveAssignmentForAsset(record.assetId);
        
        const props = (record as any).props; // bypass getter para snapshot
        props.collaboratorInTurnId = activeAssignment?.collaboratorId;
        props.collaboratorInTurnName = activeAssignment?.collaboratorName;

        record.startMaintenance(startNote);
        await this.repo.save(record);
        return record;
    }

    /**
     * Intenta notificar sin romper el flujo: el token de firma ya está generado
     * y persistido, así que un fallo de Webex (cuenta inexistente, sin red/VPN)
     * solo se reporta — el enlace sigue vigente para reenviarlo después.
     */
    private async trySendSignatureNotification(email: string, maintenanceId: string, token: string): Promise<NotificationResult> {
        if (!this.mailerService) return { sent: false, accountNotFound: false, error: 'Servicio de notificaciones no configurado' };
        try {
            await this.mailerService.sendMaintenanceSignatureEmail(email, maintenanceId, token);
            return { sent: true, accountNotFound: false };
        } catch (error: any) {
            const accountNotFound = error instanceof NotificationError && error.reason === 'ACCOUNT_NOT_FOUND';
            console.error(`❌ Notificación de mantenimiento ${maintenanceId} no enviada:`, error.message);
            return { sent: false, accountNotFound, error: error.message };
        }
    }

    async completeMaintenance(id: string, notes?: string): Promise<{ record: MaintenanceRecord; notification: NotificationResult | null }> {
        const record = await this.repo.findById(id);
        if (!record) throw new Error('Mantenimiento no encontrado');

        const nextPreventive = record.completeMaintenance(new Date(), notes);
        let notification: NotificationResult | null = null;

        // Si hay un usuario en turno, generamos token de firma para el acta
        if (record.collaboratorInTurnId) {
            const assignment = await this.assignmentService.getActiveAssignmentForAsset(record.assetId);
            if (assignment && assignment.collaboratorEmail) {
                const jwt = require('jsonwebtoken');
                const secret = process.env.JWT_SECRET || 'secret';
                const token = record.generateSignatureToken((maintId) => {
                    return jwt.sign({ maintenanceId: maintId }, secret, { expiresIn: '24h' });
                });

                notification = await this.trySendSignatureNotification(assignment.collaboratorEmail, id, token);
            }
        }

        await this.repo.save(record);

        // Guardamos el próximo programado.
        await this.repo.save(nextPreventive);

        return { record, notification };
    }

    async requestSignature(id: string): Promise<{ record: MaintenanceRecord; notification: NotificationResult }> {
        const record = await this.repo.findById(id);
        if (!record) throw new Error('Mantenimiento no encontrado');
        if (record.status !== 'COMPLETED') throw new Error('El mantenimiento no está completado');

        const assignment = await this.assignmentService.getActiveAssignmentForAsset(record.assetId);
        if (!assignment || !assignment.collaboratorEmail) {
            throw new Error('No hay un colaborador asignado al activo en este momento para firmar.');
        }

        const jwt = require('jsonwebtoken');
        const secret = process.env.JWT_SECRET || 'secret';
        const token = record.generateSignatureToken((maintId) => {
            return jwt.sign({ maintenanceId: maintId }, secret, { expiresIn: '24h' });
        });

        await this.repo.save(record);

        const notification = await this.trySendSignatureNotification(assignment.collaboratorEmail, id, token);

        return { record, notification };
    }

    async signMaintenanceAct(id: string, token: string, ipAddress: string, userAgent: string): Promise<MaintenanceRecord> {
        const record = await this.repo.findById(id);
        if (!record) throw new Error('Mantenimiento no encontrado');

        record.signMaintenance(token, { ipAddress, userAgent, signedAt: new Date().toISOString() });
        await this.repo.save(record);
        return record;
    }

    async forceSignMaintenance(id: string, reason: string, adminId: string): Promise<MaintenanceRecord> {
        const record = await this.repo.findById(id);
        if (!record) throw new Error('Mantenimiento no encontrado');

        record.forceSignMaintenance(reason, adminId);
        await this.repo.save(record);
        return record;
    }

    async updatePdfUrl(id: string, url: string): Promise<void> {
        const record = await this.repo.findById(id);
        if (record) {
            record.updatePdfUrl(url);
            await this.repo.save(record);
        }
    }
    
    async getAllMaintenances(status?: string): Promise<MaintenanceRecord[]> {
        return this.repo.findAll({ status: status as MaintenanceStatus });
    }
    
    async getAssetMaintenances(assetId: string): Promise<MaintenanceRecord[]> {
        return this.repo.findByAssetId(assetId);
    }
}
