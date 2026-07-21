import { v4 as uuidv4 } from 'uuid';
import { IMaintenanceRepository } from '../domain/IMaintenanceRepository';
import { MaintenanceRecord } from '../domain/MaintenanceRecord';
import { MaintenanceStatus, MaintenanceType } from '../domain/MaintenanceTypes';
import { NotificationError, NotificationResult } from '../../../shared/contracts/NotificationError';
import { JWT_SECRET } from '../../../shared/infrastructure/config/env';

/** Adaptadores de acceso a datos que la ruta inyecta para el import histórico. */
export interface MaintenanceImportDeps {
    /** Fecha de corte: mantenimientos en esta fecha o antes = Completados; después = Programados. */
    cutoffDate: Date;
    assetExists: (placa: string) => Promise<boolean>;
    resolveCollaborator: (email: string) => Promise<{ id: string; name: string } | null>;
}

export interface MaintenanceImportResult {
    successful: number;
    failed: number;
    completed: number;
    scheduled: number;
    reprogrammed: number;
    skipped: number;
    errors: string[];
    warnings: string[];
}

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

    /**
     * Edita las notas del acta de un mantenimiento completado y guarda.
     * Devuelve el registro actualizado para que la ruta genere el PDF.
     */
    async updateActNotes(id: string, fields: { reason?: string; startNote?: string; notes?: string }): Promise<MaintenanceRecord> {
        const record = await this.repo.findById(id);
        if (!record) throw new Error('Mantenimiento no encontrado');
        if (record.status !== 'COMPLETED') {
            throw new Error('Solo se puede generar el acta de un mantenimiento completado.');
        }
        record.updateActNotes(fields);
        await this.repo.save(record);
        return record;
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

    /**
     * Carga masiva de mantenimientos preventivos históricos desde un Excel/CSV.
     *
     * Reglas de negocio (acordadas para la migración):
     * - Llave del activo: "Placa Ikusi". Si no existe, la fila falla (no rompe la carga).
     * - Colaborador en turno: se resuelve por "Correo"; si no existe, se guarda el correo
     *   como nombre del snapshot (aviso, no bloquea).
     * - Fecha del mantenimiento: columna "Próximo mantenimiento". Todos son PREVENTIVE.
     * - Corte por fecha (deps.cutoffDate): en la fecha de corte o antes → COMPLETED
     *   (marcado como migrado/firmado, sin correo ni acta automática) y además se crea
     *   su siguiente ciclo a +1 año en estado SCHEDULED. Después del corte → SCHEDULED.
     * - Idempotencia: no se duplica un preventivo con la misma Placa y fecha programada.
     */
    async importMaintenances(records: any[], deps: MaintenanceImportDeps): Promise<MaintenanceImportResult> {
        const result: MaintenanceImportResult = {
            successful: 0, failed: 0, completed: 0, scheduled: 0, reprogrammed: 0, skipped: 0, errors: [], warnings: []
        };

        // Corte inclusivo a nivel de día: normalizamos al final del día de corte.
        const cutoff = new Date(deps.cutoffDate);
        cutoff.setHours(23, 59, 59, 999);

        const sameDay = (a: Date, b: Date) =>
            a.toISOString().split('T')[0] === b.toISOString().split('T')[0];

        const parseDate = (raw: any): Date | null => {
            if (raw instanceof Date) return raw;
            if (typeof raw === 'number') return new Date((raw - (25567 + 2)) * 86400 * 1000);
            if (typeof raw === 'string') {
                const s = raw.trim();
                if (!s) return null;
                const parts = s.split('/');
                if (parts.length === 3) {
                    const [d, m, y] = parts.map(p => parseInt(p, 10)); // Formato Colombia: día/mes/año
                    if (!d || !m || !y) return null;
                    return new Date(Date.UTC(y, m - 1, d, 12));
                }
                const dt = new Date(s);
                return isNaN(dt.getTime()) ? null : dt;
            }
            return null;
        };

        for (const [index, record] of records.entries()) {
            const rowNum = index + 2;
            try {
                // Lectura de columnas tolerante a mayúsculas/minúsculas y espacios.
                const normalizedIndex: Record<string, string> = {};
                for (const key of Object.keys(record)) {
                    normalizedIndex[key.toLowerCase().trim()] = key;
                }
                const pick = (...candidates: string[]): any => {
                    for (const cand of candidates) {
                        const realKey = normalizedIndex[cand.toLowerCase().trim()];
                        if (realKey !== undefined && record[realKey] !== undefined && record[realKey] !== '') {
                            return record[realKey];
                        }
                    }
                    return undefined;
                };

                const placaRaw = pick('Placa Ikusi', 'PlacaIkusi', 'Placa', 'ID');
                const emailRaw = pick('Correo', 'Email', 'Correo Electrónico', 'Correo Electronico');
                const dateRaw = pick('Próximo mantenimiento', 'Proximo mantenimiento', 'Próximo Mantenimiento', 'Proximo Mantenimiento');

                if (!placaRaw) throw new Error('Falta la Placa Ikusi.');
                if (!dateRaw) throw new Error('Falta la fecha de "Próximo mantenimiento".');

                const scheduledDate = parseDate(dateRaw);
                if (!scheduledDate || isNaN(scheduledDate.getTime())) {
                    throw new Error(`Fecha de mantenimiento inválida ("${dateRaw}").`);
                }

                const placa = String(placaRaw).trim();
                if (!(await deps.assetExists(placa))) {
                    result.failed++;
                    result.errors.push(`Fila ${rowNum}: el activo con Placa "${placa}" no existe; se omite.`);
                    continue;
                }

                // Snapshot del colaborador en turno.
                let snapshotId: string | undefined;
                let snapshotName: string | undefined;
                if (emailRaw) {
                    const email = String(emailRaw).trim();
                    const collaborator = await deps.resolveCollaborator(email);
                    if (collaborator) {
                        snapshotId = collaborator.id;
                        snapshotName = collaborator.name;
                    } else {
                        snapshotName = email;
                        result.warnings.push(`Fila ${rowNum}: el colaborador "${email}" no existe; se guarda el correo como usuario en turno.`);
                    }
                }

                // Idempotencia: preventivos ya existentes para esta placa.
                const existing = await this.repo.findByAssetId(placa);
                const existsPreventiveOn = (d: Date) =>
                    existing.some(m => m.type === 'PREVENTIVE' && sameDay(new Date(m.scheduledDate), d));

                const dateStr = scheduledDate.toISOString().split('T')[0];
                const isCompleted = scheduledDate.getTime() <= cutoff.getTime();

                if (isCompleted) {
                    // Registro Completado (histórico migrado: firmado, sin correo ni acta automática).
                    if (existsPreventiveOn(scheduledDate)) {
                        result.skipped++;
                        result.warnings.push(`Fila ${rowNum}: ya existía un preventivo para ${dateStr} en ${placa}; se omite.`);
                    } else {
                        await this.repo.save(new MaintenanceRecord({
                            id: `maint-${uuidv4()}`,
                            assetId: placa,
                            type: 'PREVENTIVE',
                            status: 'COMPLETED',
                            scheduledDate,
                            startedAt: scheduledDate,
                            executionDate: scheduledDate,
                            collaboratorInTurnId: snapshotId,
                            collaboratorInTurnName: snapshotName,
                            signedAt: scheduledDate,
                            signatureMetadata: { migrated: true, note: 'Registro histórico migrado (carga masiva).' }
                        }));
                        result.completed++;
                        result.successful++;
                    }

                    // Siguiente ciclo a +1 año en estado Programado.
                    const nextDate = new Date(scheduledDate);
                    nextDate.setFullYear(nextDate.getFullYear() + 1);
                    if (!existsPreventiveOn(nextDate)) {
                        await this.repo.save(new MaintenanceRecord({
                            id: `maint-${uuidv4()}`,
                            assetId: placa,
                            type: 'PREVENTIVE',
                            status: 'SCHEDULED',
                            scheduledDate: nextDate,
                            collaboratorInTurnId: snapshotId,
                            collaboratorInTurnName: snapshotName
                        }));
                        result.reprogrammed++;
                        result.successful++;
                    }
                } else {
                    // Mantenimiento futuro: solo Programado.
                    if (existsPreventiveOn(scheduledDate)) {
                        result.skipped++;
                        result.warnings.push(`Fila ${rowNum}: ya existía un preventivo para ${dateStr} en ${placa}; se omite.`);
                    } else {
                        await this.repo.save(new MaintenanceRecord({
                            id: `maint-${uuidv4()}`,
                            assetId: placa,
                            type: 'PREVENTIVE',
                            status: 'SCHEDULED',
                            scheduledDate,
                            collaboratorInTurnId: snapshotId,
                            collaboratorInTurnName: snapshotName
                        }));
                        result.scheduled++;
                        result.successful++;
                    }
                }
            } catch (error: any) {
                result.failed++;
                result.errors.push(`Fila ${rowNum}: ${error.message}`);
            }
        }

        return result;
    }
}
