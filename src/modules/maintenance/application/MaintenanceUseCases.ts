import { IMaintenanceRepository } from '../domain/IMaintenanceRepository';
import { MaintenanceRecord } from '../domain/MaintenanceRecord';
import { MaintenanceStatus, MaintenanceType } from '../domain/MaintenanceTypes';
import { NotificationError, NotificationResult } from '../../../shared/contracts/NotificationError';
import { JWT_SECRET } from '../../../shared/infrastructure/config/env';

// Definimos un contrato para consultar si un activo está asignado (así no acoplamos directamente al repositorio de asignaciones)
export interface IAssetAssignmentService {
    getActiveAssignmentForAsset(assetId: string): Promise<{ collaboratorId: string, collaboratorName: string, collaboratorEmail: string } | null>;
}

export class MaintenanceUseCases {
    constructor(
        private repo: IMaintenanceRepository,
        private assignmentService: IAssetAssignmentService,
        private mailerService?: any, // We will type it properly
        /**
         * Genera el acta borrador (sin firma) del mantenimiento y devuelve su ruta,
         * para adjuntarla en la notificación de Webex. Inyectado desde las rutas,
         * que son quienes conocen el servicio de PDF y los datos del activo.
         */
        private draftActaProvider?: (record: MaintenanceRecord) => Promise<string>
    ) {}

    async createManualMaintenance(dto: { assetId: string, type: MaintenanceType, scheduledDate: Date, reason?: string }): Promise<MaintenanceRecord> {
        const existingMaintenances = await this.repo.findByAssetId(dto.assetId);
        // Regla de negocio: un activo no puede tener más de un mantenimiento activo del MISMO tipo
        // a la vez. Sí puede tener a la vez uno preventivo y uno correctivo, porque son
        // independientes (p. ej. una revisión programada y una reparación urgente).
        const activeMaintenance = existingMaintenances.find(
            m => (m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS') && m.type === dto.type
        );

        if (activeMaintenance) {
            const d = new Date(activeMaintenance.scheduledDate);
            const dateStr = d.toISOString().split('T')[0];
            const typeStr = activeMaintenance.type === 'PREVENTIVE' ? 'Preventivo' : 'Correctivo';
            throw new Error(`El equipo ya cuenta con un mantenimiento ${typeStr} programado para la fecha ${dateStr}. Debe completarse antes de programar otro del mismo tipo.`);
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
    private async trySendSignatureNotification(email: string, maintenanceId: string, token: string, record?: MaintenanceRecord): Promise<NotificationResult> {
        if (!this.mailerService) return { sent: false, accountNotFound: false, error: 'Servicio de notificaciones no configurado' };

        // Acta borrador (sin firma) para adjuntar al mensaje. Si su generación
        // falla, se notifica igual sin adjunto: el enlace de firma es lo esencial.
        let documentPath: string | undefined;
        if (record && this.draftActaProvider) {
            try {
                documentPath = await this.draftActaProvider(record);
            } catch (error: any) {
                console.error(`⚠️ No se pudo generar el acta borrador de ${maintenanceId}:`, error.message);
            }
        }

        try {
            await this.mailerService.sendMaintenanceSignatureEmail(email, maintenanceId, token, documentPath);
            return { sent: true, accountNotFound: false };
        } catch (error: any) {
            const accountNotFound = error instanceof NotificationError && error.reason === 'ACCOUNT_NOT_FOUND';
            console.error(`❌ Notificación de mantenimiento ${maintenanceId} no enviada:`, error.message);
            return { sent: false, accountNotFound, error: error.message };
        }
    }

    async completeMaintenance(id: string, notes?: string, realStartDate?: Date, realEndDate?: Date): Promise<{ record: MaintenanceRecord; notification: NotificationResult | null }> {
        const record = await this.repo.findById(id);
        if (!record) throw new Error('Mantenimiento no encontrado');

        const nextPreventive = record.completeMaintenance(realEndDate || new Date(), notes, realStartDate);
        let notification: NotificationResult | null = null;

        // Si hay un usuario en turno, generamos token de firma para el acta
        if (record.collaboratorInTurnId) {
            const assignment = await this.assignmentService.getActiveAssignmentForAsset(record.assetId);
            if (assignment && assignment.collaboratorEmail) {
                const jwt = require('jsonwebtoken');
                const secret = JWT_SECRET;
                const token = record.generateSignatureToken((maintId) => {
                    return jwt.sign({ maintenanceId: maintId }, secret, { expiresIn: '24h' });
                });

                notification = await this.trySendSignatureNotification(assignment.collaboratorEmail, id, token, record);
            }
        }

        await this.repo.save(record);

        // Solo los preventivos generan el siguiente ciclo automáticamente; los correctivos cierran aquí.
        if (nextPreventive) {
            // El activo puede seguir asignado al momento de reprogramar; capturamos la foto
            // del usuario en turno igual que en createManualMaintenance/startMaintenance.
            const activeAssignment = await this.assignmentService.getActiveAssignmentForAsset(record.assetId);
            const nextProps = (nextPreventive as any).props;
            nextProps.collaboratorInTurnId = activeAssignment?.collaboratorId;
            nextProps.collaboratorInTurnName = activeAssignment?.collaboratorName;

            await this.repo.save(nextPreventive);
        }

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
        const secret = JWT_SECRET;
        const token = record.generateSignatureToken((maintId) => {
            return jwt.sign({ maintenanceId: maintId }, secret, { expiresIn: '24h' });
        });

        await this.repo.save(record);

        const notification = await this.trySendSignatureNotification(assignment.collaboratorEmail, id, token, record);

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

    /**
     * Mantenimientos programados que vencen dentro de `days` días (incluye los ya vencidos).
     */
    async getMaintenancesDueWithinDays(days: number): Promise<MaintenanceRecord[]> {
        return this.repo.findMaintenancesDueWithinDays(days);
    }

    /**
     * Registra que se notificó hoy el vencimiento de varios mantenimientos (job diario de alertas),
     * para que no se vuelvan a incluir en el digest hasta el día siguiente.
     */
    async registerMaintenanceAlertsSent(maintenanceIds: string[], sentAt: Date = new Date()): Promise<void> {
        const records = await this.repo.findByIds(maintenanceIds);
        records.forEach(record => record.registerAlertSent(sentAt));
        await Promise.all(records.map(record => this.repo.save(record)));
    }
}
