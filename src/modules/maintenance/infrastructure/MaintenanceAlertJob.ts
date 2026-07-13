import * as cron from 'node-cron';
import { MaintenanceUseCases } from '../application/MaintenanceUseCases';
import { MaintenanceRecord } from '../domain/MaintenanceRecord';
import { PostgresMaintenanceRepository } from './PostgresMaintenanceRepository';
import { AppDataSource } from '../../../shared/infrastructure/database/postgres';
import { PostgresUserRepository } from '../../auth/infrastructure/repositories/PostgresUserRepository';
import { Role } from '../../auth/domain/Role';
import { PostgresCatalogRepository } from '../../catalog/infrastructure/PostgresCatalogRepository';
import { WebexNotificationService } from '../../../shared/infrastructure/services/WebexNotificationService';

const ALERT_THRESHOLD_DAYS = 5;
const BOGOTA_TZ = 'America/Bogota';

/** Fecha (YYYY-MM-DD) en hora Bogotá, para comparar "mismo día" sin depender de la zona horaria del servidor. */
function bogotaDateKey(date: Date): string {
    return date.toLocaleDateString('en-CA', { timeZone: BOGOTA_TZ });
}

function daysUntil(scheduledDate: Date, now: Date): number {
    const due = new Date(bogotaDateKey(scheduledDate));
    const today = new Date(bogotaDateKey(now));
    return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Job diario: notifica a los administradores, en un solo mensaje de Webex por
 * administrador, TODOS los mantenimientos programados a `ALERT_THRESHOLD_DAYS`
 * días o menos de su fecha (incluye los ya vencidos). Se repite cada día hasta
 * que el mantenimiento se inicie/complete (deja de estar SCHEDULED). No reenvía
 * si ya se notificó hoy.
 */
export async function runMaintenanceAlertJob(): Promise<void> {
    const repo = new PostgresMaintenanceRepository(AppDataSource);
    const mailerService = new WebexNotificationService();
    const assignmentAdapter: any = { async getActiveAssignmentForAsset() { return null; } };
    const maintenanceUseCases = new MaintenanceUseCases(repo, assignmentAdapter, mailerService);
    const userRepo = new PostgresUserRepository();
    const catalogRepo = new PostgresCatalogRepository();

    try {
        const dueMaintenances = await maintenanceUseCases.getMaintenancesDueWithinDays(ALERT_THRESHOLD_DAYS);
        if (dueMaintenances.length === 0) return;

        const now = new Date();
        const todayKey = bogotaDateKey(now);
        const pendingToday = dueMaintenances.filter(m => !m.lastAlertSentAt || bogotaDateKey(m.lastAlertSentAt) !== todayKey);
        if (pendingToday.length === 0) {
            console.log('ℹ️ [MaintenanceAlertJob] Todos los mantenimientos por vencer ya fueron notificados hoy.');
            return;
        }

        const admins = (await userRepo.findAll()).filter(u =>
            u.isActive && u.email && (u.role === Role.SUPER_ADMIN || u.role === Role.ADMINISTRADOR)
        );
        if (admins.length === 0) {
            console.warn('⚠️ [MaintenanceAlertJob] No hay administradores activos con email para notificar mantenimientos por vencer.');
            return;
        }

        const items = await Promise.all(dueMaintenances.map(async (m: MaintenanceRecord) => {
            let hostname: string | undefined;
            try {
                const asset = await catalogRepo.getAssetById(m.assetId);
                hostname = asset?.dynamicAttributes?.hostname || asset?.dynamicAttributes?.Hostname || asset?.dynamicAttributes?.HOSTNAME;
            } catch (_) { /* el hostname es informativo, no bloquea el envío */ }
            return {
                assetId: m.assetId,
                hostname,
                type: m.type,
                scheduledDate: m.scheduledDate,
                daysLeft: daysUntil(m.scheduledDate, now)
            };
        }));

        let sentToAtLeastOne = false;
        for (const admin of admins) {
            try {
                await mailerService.sendMaintenanceExpiryDigest(admin.email, items, ALERT_THRESHOLD_DAYS);
                sentToAtLeastOne = true;
            } catch (error: any) {
                console.error(`❌ [MaintenanceAlertJob] No se pudo notificar a ${admin.email}:`, error.message || error);
            }
        }

        if (sentToAtLeastOne) {
            await maintenanceUseCases.registerMaintenanceAlertsSent(pendingToday.map(m => m.id), now);
            console.log(`✅ [MaintenanceAlertJob] Digest de ${items.length} mantenimiento(s) enviado a ${admins.length} administrador(es).`);
        }
    } catch (error: any) {
        console.error('❌ [MaintenanceAlertJob] Error ejecutando el job de alertas de mantenimiento:', error.message || error);
    }
}

/** Programa el job para correr todos los días a las 8:15 a.m., hora Bogotá (5 min después del de préstamos). */
export function scheduleMaintenanceAlertJob(): void {
    cron.schedule('15 8 * * *', () => {
        runMaintenanceAlertJob();
    }, { timezone: BOGOTA_TZ });
    console.log('🕗 [MaintenanceAlertJob] Job de alertas de mantenimiento programado (diario, 8:15 a.m. hora Bogotá).');
}
