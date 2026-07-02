import { Router } from 'express';
import { MaintenanceUseCases } from '../../modules/maintenance/application/MaintenanceUseCases';
import { PostgresMaintenanceRepository } from '../../modules/maintenance/infrastructure/PostgresMaintenanceRepository';
import { AppDataSource } from '../../shared/infrastructure/database/postgres';
import { AssignmentUseCases } from '../../modules/assignment/application/AssignmentUseCases';
import { PostgresAssignmentRepository } from '../../modules/assignment/infrastructure/PostgresAssignmentRepository';
import { WebexNotificationService } from '../../shared/infrastructure/services/WebexNotificationService';
import { PdfKitService } from '../../shared/infrastructure/services/PdfKitService';

const router = Router();

// Dependencias
const repo = new PostgresMaintenanceRepository(AppDataSource);
const mailerService = new WebexNotificationService();
const documentService = new PdfKitService();

// Fake o adaptamos IAssetAssignmentService
const assignmentRepo = new PostgresAssignmentRepository();

const assignmentAdapter: any = {
    async getActiveAssignmentForAsset(assetId: string) {
        const assignment = await assignmentRepo.findCurrentByAssetId(assetId);
        if (!assignment || !assignment.collaboratorId) return null;

        const collaboratorRepo = new (require('../../modules/collaborator/infrastructure/PostgresCollaboratorRepository').PostgresCollaboratorRepository)(AppDataSource);
        const collaborator = await collaboratorRepo.findById(assignment.collaboratorId);

        return {
            collaboratorId: assignment.collaboratorId,
            collaboratorName: collaborator?.name || 'Usuario Asignado',
            collaboratorEmail: collaborator?.email || 'test@example.com'
        };
    }
};

const useCases = new MaintenanceUseCases(repo, assignmentAdapter, mailerService);

const serializeRecord = (record: any) => {
    return {
        id: record.id,
        assetId: record.assetId,

        type: record.type,
        status: record.status,
        scheduledDate: record.scheduledDate,
        executionDate: record.executionDate,
        reason: record.reason,
        startNote: record.startNote,
        notes: record.notes,
        collaboratorInTurnId: record.collaboratorInTurnId,
        collaboratorInTurnName: record.collaboratorInTurnName,
        signatureToken: record.signatureToken,
        signedAt: record.signedAt,
        pdfUrl: record.pdfUrl
    };
};

// 1. Crear / Agendar mantenimiento
router.post('/', async (req, res) => {
    try {
        const { assetId, type, scheduledDate, reason } = req.body;
        const parsedDate = new Date(scheduledDate.includes('T') ? scheduledDate : `${scheduledDate}T12:00:00Z`);
        const result = await useCases.createManualMaintenance({ assetId, type, scheduledDate: parsedDate, reason });
        res.status(201).json(serializeRecord(result));
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// 2. Iniciar mantenimiento
router.post('/:id/start', async (req, res) => {
    try {
        const { startNote } = req.body;
        const result = await useCases.startMaintenance(req.params.id, startNote);
        res.json(serializeRecord(result));
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// 3. Completar mantenimiento
router.post('/:id/complete', async (req, res) => {
    try {
        const { notes } = req.body;
        const { record, notification } = await useCases.completeMaintenance(req.params.id, notes);
        res.json({
            ...serializeRecord(record),
            // notification es null cuando no había colaborador en turno que notificar
            notificationSent: notification ? notification.sent : null,
            accountNotFound: notification ? notification.accountNotFound : false,
            notificationError: notification?.error
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// 3.5 Solicitar firma manualmente
router.post('/:id/request-signature', async (req, res) => {
    try {
        const { record, notification } = await useCases.requestSignature(req.params.id);
        res.json({
            message: notification.sent
                ? 'Solicitud de firma enviada al colaborador por Webex.'
                : (notification.accountNotFound
                    ? 'La cuenta de Webex del colaborador no existe. El enlace de firma sigue vigente: usa "Solicitar firma" de nuevo cuando el destinatario sea correcto.'
                    : 'No se pudo enviar la notificación de Webex, pero el enlace de firma sigue vigente. Intenta reenviar más tarde.'),
            record: serializeRecord(record),
            notificationSent: notification.sent,
            accountNotFound: notification.accountNotFound,
            notificationError: notification.error
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// 4. Obtener todos (opcional filtro)
router.get('/', async (req, res) => {
    try {
        const status = req.query.status as string;
        const result = await useCases.getAllMaintenances(status);
        res.json(result.map(serializeRecord));
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// 5. Obtener mantenimientos por activo
router.get('/asset/:assetId', async (req, res) => {
    try {
        const result = await useCases.getAssetMaintenances(req.params.assetId);
        res.json(result.map(serializeRecord));
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// 6. Verificar token de firma (Público)
router.get('/verify-token/:token', async (req, res) => {
    try {
        const jwt = require('jsonwebtoken');
        const secret = process.env.JWT_SECRET || 'secret';
        const decoded = jwt.verify(req.params.token, secret) as any;

        const record = await repo.findById(decoded.maintenanceId);
        if (!record || record.signatureToken !== req.params.token) {
            return res.status(400).json({ error: 'Token inválido o expirado' });
        }
        res.json(serializeRecord(record));
    } catch (error: any) {
        res.status(400).json({ error: 'Token inválido o expirado' });
    }
});

// 7. Aceptar y firmar acta electrónicamente (Público)
router.get('/accept', async (req, res) => {
    try {
        const token = req.query.token as string;
        if (!token) {
            return res.status(400).send('Token de firma es requerido.');
        }

        const jwt = require('jsonwebtoken');
        const secret = process.env.JWT_SECRET || 'secret';
        const decoded = jwt.verify(token, secret) as any;

        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        const record = await useCases.signMaintenanceAct(decoded.maintenanceId, token, ipAddress, userAgent);

        // Generar PDF
        const { PdfKitService } = require('../../shared/infrastructure/services/PdfKitService');
        const documentService = new PdfKitService();

        // Simular que traemos datos del activo para el PDF
        const catalogRepo = new (require('../../modules/catalog/infrastructure/PostgresCatalogRepository').PostgresCatalogRepository)(AppDataSource);
        const asset = await catalogRepo.getAssetById(record.assetId);
        let categoryName = 'EQUIPO';
        if (asset && asset.categoryId) {
            const category = await catalogRepo.getCategoryById(asset.categoryId);
            if (category) categoryName = category.name;
        }

        const activeAssignment = await assignmentAdapter.getActiveAssignmentForAsset(record.assetId);
        const recordData = serializeRecord(record) as any;
        if (activeAssignment && !recordData.collaboratorInTurnName) {
            recordData.collaboratorInTurnName = activeAssignment.collaboratorName;
            recordData.collaboratorEmail = activeAssignment.collaboratorEmail;
        }

        // Generate PDF (sin firma gráfica)
        const pdfPath = await documentService.generateMaintenanceAct(recordData, asset, "", categoryName);

        await useCases.updatePdfUrl(record.id, pdfPath);

        res.send(`
            <div style="text-align:center; padding: 50px; font-family: sans-serif;">
                <h1 style="color: green;">✅ Acta de Mantenimiento Aceptada</h1>
                <p>El mantenimiento ha sido aceptado a conformidad. Tu firma electrónica ha sido registrada exitosamente.</p>
                <p>Se ha generado el Acta Física (PDF) inmutable.</p>
                <a href="${process.env.BACKEND_URL || 'http://localhost:3000'}${pdfPath}" target="_blank" style="display:inline-block; margin-top:20px; padding:10px 20px; background:#00a650; color:white; text-decoration:none; border-radius:5px;">Ver Acta Firmada (PDF)</a>
            </div>
        `);
    } catch (error: any) {
        res.status(400).send(`
            <div style="text-align:center; padding: 50px; font-family: sans-serif;">
                <h1 style="color: red;">❌ Error al aceptar mantenimiento</h1>
                <p>${error.message}</p>
            </div>
        `);
    }
});

// 8. Firmar acta (Público - Legacy UI)
router.post('/sign', async (req, res) => {
    try {
        const { token, signature } = req.body;
        const jwt = require('jsonwebtoken');
        const secret = process.env.JWT_SECRET || 'secret';
        const decoded = jwt.verify(token, secret) as any;

        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        const record = await useCases.signMaintenanceAct(decoded.maintenanceId, token, ip, userAgent);

        // Generar PDF
        const { PdfKitService } = require('../../shared/infrastructure/services/PdfKitService');
        const documentService = new PdfKitService();

        // Simular que traemos datos del activo para el PDF
        const catalogRepo = new (require('../../modules/catalog/infrastructure/PostgresCatalogRepository').PostgresCatalogRepository)(AppDataSource);
        const asset = await catalogRepo.getAssetById(record.assetId);
        let categoryName = 'EQUIPO';
        if (asset && asset.categoryId) {
            const category = await catalogRepo.getCategoryById(asset.categoryId);
            if (category) categoryName = category.name;
        }

        const activeAssignment = await assignmentAdapter.getActiveAssignmentForAsset(record.assetId);
        const recordData = serializeRecord(record) as any;
        if (activeAssignment && !recordData.collaboratorInTurnName) {
            recordData.collaboratorInTurnName = activeAssignment.collaboratorName;
            recordData.collaboratorEmail = activeAssignment.collaboratorEmail;
        }

        // Generate PDF
        const pdfPath = await documentService.generateMaintenanceAct(recordData, asset, signature, categoryName);

        await useCases.updatePdfUrl(record.id, pdfPath);

        res.json({ message: 'Firmado correctamente', pdfUrl: pdfPath });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// 9. Firma forzada
router.post('/:id/force-sign', async (req, res) => {
    try {
        const { reason } = req.body;
        const adminId = 'admin'; // Simulación

        const record = await useCases.forceSignMaintenance(req.params.id, reason, adminId);

        // Generar PDF
        const { PdfKitService } = require('../../shared/infrastructure/services/PdfKitService');
        const documentService = new PdfKitService();

        const catalogRepo = new (require('../../modules/catalog/infrastructure/PostgresCatalogRepository').PostgresCatalogRepository)(AppDataSource);
        const asset = await catalogRepo.getAssetById(record.assetId);
        let categoryName = 'EQUIPO';
        if (asset && asset.categoryId) {
            const category = await catalogRepo.getCategoryById(asset.categoryId);
            if (category) categoryName = category.name;
        }

        const activeAssignment = await assignmentAdapter.getActiveAssignmentForAsset(record.assetId);
        const recordData = serializeRecord(record) as any;
        if (activeAssignment && !recordData.collaboratorInTurnName) {
            recordData.collaboratorInTurnName = activeAssignment.collaboratorName;
            recordData.collaboratorEmail = activeAssignment.collaboratorEmail;
        }

        const signatureText = `Firma forzada por administrador.\nMotivo: ${reason}`;
        const pdfPath = await documentService.generateMaintenanceAct(recordData, asset, signatureText, categoryName);

        await useCases.updatePdfUrl(record.id, pdfPath);

        res.json({ message: 'Mantenimiento firmado forzadamente', record: serializeRecord(record) });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export { router as maintenanceRouter };
