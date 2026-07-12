import * as cron from 'node-cron';
import { AssignmentUseCases } from '../application/AssignmentUseCases';
import { Assignment } from '../domain/Assignment';
import { PostgresAssignmentRepository } from './PostgresAssignmentRepository';
import { PostgresUserRepository } from '../../auth/infrastructure/repositories/PostgresUserRepository';
import { Role } from '../../auth/domain/Role';
import { PostgresCollaboratorRepository } from '../../collaborator/infrastructure/PostgresCollaboratorRepository';
import { CatalogUseCases } from '../../catalog/application/CatalogUseCases';
import { PostgresCatalogRepository } from '../../catalog/infrastructure/PostgresCatalogRepository';
import { WebexNotificationService } from '../../../shared/infrastructure/services/WebexNotificationService';

const ALERT_THRESHOLD_DAYS = 5;
const BOGOTA_TZ = 'America/Bogota';

/** Fecha (YYYY-MM-DD) en hora Bogotá, para comparar "mismo día" sin depender de la zona horaria del servidor. */
function bogotaDateKey(date: Date): string {
    return date.toLocaleDateString('en-CA', { timeZone: BOGOTA_TZ });
}

function daysUntil(expectedReturnDate: Date, now: Date): number {
    const due = new Date(bogotaDateKey(expectedReturnDate));
    const today = new Date(bogotaDateKey(now));
    return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Job diario: notifica a los administradores, en un solo mensaje de Webex por
 * administrador, TODOS los préstamos activos a `ALERT_THRESHOLD_DAYS` días o
 * menos de su devolución (incluye los ya vencidos). Se repite cada día hasta
 * que el préstamo se devuelva (deja de estar ACCEPTED) o se extienda su fecha
 * (lo que reinicia `lastAlertSentAt`). No reenvía si ya se notificó hoy.
 */
export async function runLoanExpiryAlertJob(): Promise<void> {
    const assignmentRepo = new PostgresAssignmentRepository();
    const mailerService = new WebexNotificationService();
    const assignmentUseCases = new AssignmentUseCases(assignmentRepo, mailerService);
    const userRepo = new PostgresUserRepository();
    const collaboratorRepo = new PostgresCollaboratorRepository();
    const catalogUseCases = new CatalogUseCases(new PostgresCatalogRepository());

    try {
        const dueLoans = await assignmentUseCases.getLoansDueWithinDays(ALERT_THRESHOLD_DAYS);
        if (dueLoans.length === 0) return;

        const now = new Date();
        const todayKey = bogotaDateKey(now);
        const pendingToday = dueLoans.filter(a => !a.lastAlertSentAt || bogotaDateKey(a.lastAlertSentAt) !== todayKey);
        if (pendingToday.length === 0) {
            console.log('ℹ️ [LoanAlertJob] Todos los préstamos por vencer ya fueron notificados hoy.');
            return;
        }

        const admins = (await userRepo.findAll()).filter(u =>
            u.isActive && u.email && (u.role === Role.SUPER_ADMIN || u.role === Role.ADMINISTRADOR)
        );
        if (admins.length === 0) {
            console.warn('⚠️ [LoanAlertJob] No hay administradores activos con email para notificar préstamos por vencer.');
            return;
        }

        const items = await Promise.all(dueLoans.map(async (a: Assignment) => {
            let collaboratorName = a.collaboratorId;
            let hostname: string | undefined;
            try {
                const collaborator = await collaboratorRepo.findById(a.collaboratorId);
                if (collaborator) collaboratorName = collaborator.name;
            } catch (_) { /* si no se encuentra, se usa el ID como fallback */ }
            try {
                const asset = await catalogUseCases.getAssetById(a.assetId);
                hostname = asset?.dynamicAttributes?.hostname || asset?.dynamicAttributes?.Hostname || asset?.dynamicAttributes?.HOSTNAME;
            } catch (_) { /* el hostname es informativo, no bloquea el envío */ }
            return {
                assetId: a.assetId,
                hostname,
                collaboratorName,
                expectedReturnDate: a.expectedReturnDate!,
                daysLeft: daysUntil(a.expectedReturnDate!, now)
            };
        }));

        let sentToAtLeastOne = false;
        for (const admin of admins) {
            try {
                await mailerService.sendLoanExpiryDigest(admin.email, items, ALERT_THRESHOLD_DAYS);
                sentToAtLeastOne = true;
            } catch (error: any) {
                console.error(`❌ [LoanAlertJob] No se pudo notificar a ${admin.email}:`, error.message || error);
            }
        }

        if (sentToAtLeastOne) {
            await assignmentUseCases.registerLoanAlertsSent(pendingToday.map(a => a.id), now);
            console.log(`✅ [LoanAlertJob] Digest de ${items.length} préstamo(s) enviado a ${admins.length} administrador(es).`);
        }
    } catch (error: any) {
        console.error('❌ [LoanAlertJob] Error ejecutando el job de alertas de préstamos:', error.message || error);
    }
}

/** Programa el job para correr todos los días a las 8:00 a.m., hora Bogotá. */
export function scheduleLoanExpiryAlertJob(): void {
    cron.schedule('0 8 * * *', () => {
        runLoanExpiryAlertJob();
    }, { timezone: BOGOTA_TZ });
    console.log('🕗 [LoanAlertJob] Job de alertas de préstamos programado (diario, 8:00 a.m. hora Bogotá).');
}
