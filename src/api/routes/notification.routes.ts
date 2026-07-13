import { Router } from 'express';
import { AppDataSource } from '../../shared/infrastructure/database/postgres';
import { PostgresAssignmentRepository } from '../../modules/assignment/infrastructure/PostgresAssignmentRepository';
import { PostgresMaintenanceRepository } from '../../modules/maintenance/infrastructure/PostgresMaintenanceRepository';
import { PostgresCollaboratorRepository } from '../../modules/collaborator/infrastructure/PostgresCollaboratorRepository';

const router = Router();

const ALERT_THRESHOLD_DAYS = 5;

interface NotificationItem {
    id: string;
    type: 'LOAN_DUE' | 'MAINTENANCE_DUE' | 'SIGNATURE_PENDING';
    severity: 'danger' | 'warning';
    title: string;
    subtitle: string;
    link: string;
}

/**
 * Resumen agregado de pendientes operativos: préstamos por vencer, mantenimientos
 * por vencer y actas (asignación/mantenimiento) pendientes de firma. Reutiliza los
 * repositorios existentes en modo de solo lectura, sin duplicar el estado que ya
 * calculan LoanAlertJob / MaintenanceAlertJob.
 */
router.get('/summary', async (req, res) => {
    try {
        const assignmentRepo = new PostgresAssignmentRepository();
        const maintenanceRepo = new PostgresMaintenanceRepository(AppDataSource);
        const collaboratorRepo = new PostgresCollaboratorRepository();

        const [dueLoans, dueMaintenances, activeAssignments, completedMaintenances] = await Promise.all([
            assignmentRepo.findLoansDueWithinDays(ALERT_THRESHOLD_DAYS),
            maintenanceRepo.findMaintenancesDueWithinDays(ALERT_THRESHOLD_DAYS),
            assignmentRepo.findAllActive(),
            maintenanceRepo.findAll({ status: 'COMPLETED' as any })
        ]);

        const items: NotificationItem[] = [];

        for (const loan of dueLoans) {
            const collaborator = await collaboratorRepo.findById(loan.collaboratorId).catch(() => null);
            const overdue = loan.expectedReturnDate ? loan.expectedReturnDate.getTime() < Date.now() : false;
            items.push({
                id: `loan-${loan.id}`,
                type: 'LOAN_DUE',
                severity: overdue ? 'danger' : 'warning',
                title: `Préstamo ${overdue ? 'vencido' : 'por vencer'}: ${loan.assetId}`,
                subtitle: `Colaborador: ${collaborator?.name || loan.collaboratorId}`,
                link: `/assets/${loan.assetId}`
            });
        }

        for (const maint of dueMaintenances) {
            const overdue = maint.scheduledDate.getTime() < Date.now();
            items.push({
                id: `maint-due-${maint.id}`,
                type: 'MAINTENANCE_DUE',
                severity: overdue ? 'danger' : 'warning',
                title: `Mantenimiento ${overdue ? 'vencido' : 'por vencer'}: ${maint.assetId}`,
                subtitle: maint.type === 'PREVENTIVE' ? 'Preventivo' : 'Correctivo',
                link: `/maintenances`
            });
        }

        const pendingAssignmentSignatures = activeAssignments.filter(a => a.status === 'PENDING_ACCEPTANCE' || a.status === 'PENDING_RETURN');
        for (const a of pendingAssignmentSignatures) {
            const collaborator = await collaboratorRepo.findById(a.collaboratorId).catch(() => null);
            items.push({
                id: `assign-sig-${a.id}`,
                type: 'SIGNATURE_PENDING',
                severity: 'warning',
                title: a.status === 'PENDING_ACCEPTANCE' ? `Firma de asignación pendiente: ${a.assetId}` : `Firma de devolución pendiente: ${a.assetId}`,
                subtitle: `Colaborador: ${collaborator?.name || a.collaboratorId}`,
                link: `/assets/${a.assetId}`
            });
        }

        const pendingMaintenanceSignatures = completedMaintenances.filter(m => !m.signedAt);
        for (const m of pendingMaintenanceSignatures) {
            items.push({
                id: `maint-sig-${m.id}`,
                type: 'SIGNATURE_PENDING',
                severity: 'warning',
                title: `Firma de acta de mantenimiento pendiente: ${m.assetId}`,
                subtitle: m.collaboratorInTurnName || 'Sin usuario en turno',
                link: `/maintenances`
            });
        }

        res.json({
            counts: {
                total: items.length,
                loansDue: dueLoans.length,
                maintenancesDue: dueMaintenances.length,
                pendingSignatures: pendingAssignmentSignatures.length + pendingMaintenanceSignatures.length
            },
            items
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export { router as notificationRouter };
