import { Router } from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { z } from 'zod';
import { MaintenanceUseCases } from '../../modules/maintenance/application/MaintenanceUseCases';
import { PostgresMaintenanceRepository } from '../../modules/maintenance/infrastructure/PostgresMaintenanceRepository';
import { AppDataSource } from '../../shared/infrastructure/database/postgres';
import { AssignmentUseCases } from '../../modules/assignment/application/AssignmentUseCases';
import { PostgresAssignmentRepository } from '../../modules/assignment/infrastructure/PostgresAssignmentRepository';
import { WebexNotificationService } from '../../shared/infrastructure/services/WebexNotificationService';
import { PdfKitService } from '../../shared/infrastructure/services/PdfKitService';
import { JWT_SECRET } from '../../shared/infrastructure/config/env';
import { validateBody } from '../middlewares/validate.middleware';

const router = Router();

const createMaintenanceSchema = z.object({
    assetId: z.string().min(1, 'assetId es requerido'),
    type: z.string().min(1, 'type es requerido'),
    scheduledDate: z.string().min(1, 'scheduledDate es requerido'),
    reason: z.string().optional(),
});

const startMaintenanceSchema = z.object({
    startNote: z.string().optional(),
});

const completeMaintenanceSchema = z.object({
    notes: z.string().optional(),
    realStartDate: z.string().optional(),
    realEndDate: z.string().optional(),
});

const signSchema = z.object({
    token: z.string().min(1, 'token es requerido'),
    signature: z.string().min(1, 'signature es requerida'),
});

const forceSignSchema = z.object({
    reason: z.string().min(1, 'reason es obligatorio'),
});

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

/**
 * Genera el acta borrador (sin firma gráfica) para adjuntarla a la notificación
 * de Webex. No actualiza pdf_url: ese campo marca el acta FIRMADA en la UI.
 * Usa el mismo nombre de archivo que el acta final, así la versión firmada la
 * reemplaza al momento de firmar (sin duplicados en el módulo Actas).
 */
const draftActaProvider = async (record: any): Promise<string> => {
    const { PostgresCatalogRepository } = require('../../modules/catalog/infrastructure/PostgresCatalogRepository');
    const catalogRepo = new PostgresCatalogRepository(AppDataSource);
    const asset = await catalogRepo.getAssetById(record.assetId);
    let categoryName = 'EQUIPO';
    if (asset && asset.categoryId) {
        const category = await catalogRepo.getCategoryById(asset.categoryId);
        if (category) categoryName = category.name;
    }

    const recordData = serializeRecord(record) as any;
    if (!recordData.collaboratorInTurnName) {
        const activeAssignment = await assignmentAdapter.getActiveAssignmentForAsset(record.assetId);
        if (activeAssignment) {
            recordData.collaboratorInTurnName = activeAssignment.collaboratorName;
            recordData.collaboratorEmail = activeAssignment.collaboratorEmail;
        }
    }

    return documentService.generateMaintenanceAct(recordData, asset, '', categoryName);
};

const useCases = new MaintenanceUseCases(repo, assignmentAdapter, mailerService, draftActaProvider);

const serializeRecord = (record: any) => {
    return {
        id: record.id,
        assetId: record.assetId,

        type: record.type,
        status: record.status,
        scheduledDate: record.scheduledDate,
        startedAt: record.startedAt,
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
router.post('/', validateBody(createMaintenanceSchema), async (req, res) => {
    try {
        const { assetId, type, scheduledDate, reason } = req.body;
        const parsedDate = new Date(scheduledDate.includes('T') ? scheduledDate : `${scheduledDate}T12:00:00Z`);
        const result = await useCases.createManualMaintenance({ assetId, type, scheduledDate: parsedDate, reason });
        res.status(201).json(serializeRecord(result));
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// 1b. Importación masiva de mantenimientos históricos (Excel/CSV)
const uploadMaintenance = multer({ storage: multer.memoryStorage() });
router.post('/import', uploadMaintenance.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }

        const isCsv = req.file.originalname.toLowerCase().endsWith('.csv');
        const workbook = isCsv
            ? xlsx.read(req.file.buffer.toString('utf8'), { type: 'string', cellDates: true })
            : xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const records = xlsx.utils.sheet_to_json(sheet);

        const { PostgresCatalogRepository } = require('../../modules/catalog/infrastructure/PostgresCatalogRepository');
        const { PostgresCollaboratorRepository } = require('../../modules/collaborator/infrastructure/PostgresCollaboratorRepository');
        const catalogRepo = new PostgresCatalogRepository(AppDataSource);
        const collaboratorRepo = new PostgresCollaboratorRepository(AppDataSource);

        // Corte por defecto: hoy (fecha del servidor). Puede sobreescribirse con ?cutoffDate=YYYY-MM-DD.
        const cutoffDate = req.query.cutoffDate
            ? new Date(`${req.query.cutoffDate}T12:00:00Z`)
            : new Date();

        const result = await useCases.importMaintenances(records, {
            cutoffDate,
            assetExists: async (placa: string) => !!(await catalogRepo.getAssetById(placa)),
            resolveCollaborator: async (email: string) => {
                const collaborator = await collaboratorRepo.findByEmail(email);
                return collaborator ? { id: collaborator.id, name: collaborator.name } : null;
            }
        });

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Iniciar mantenimiento
router.post('/:id/start', validateBody(startMaintenanceSchema), async (req, res) => {
    try {
        const { startNote } = req.body;
        const result = await useCases.startMaintenance(req.params.id, startNote);
        res.json(serializeRecord(result));
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// 3. Completar mantenimiento
router.post('/:id/complete', validateBody(completeMaintenanceSchema), async (req, res) => {
    try {
        const { notes, realStartDate, realEndDate } = req.body;
        const parsedStart = realStartDate ? new Date(realStartDate.includes('T') ? realStartDate : `${realStartDate}T12:00:00Z`) : undefined;
        const parsedEnd = realEndDate ? new Date(realEndDate.includes('T') ? realEndDate : `${realEndDate}T12:00:00Z`) : undefined;
        let { record, notification } = await useCases.completeMaintenance(req.params.id, notes, parsedStart, parsedEnd);

        let autoSigned = false;
        // notification === null: no había colaborador en turno (ni asignación activa) a quien notificar
        // para firmar. Sin eso, el mantenimiento quedaría sin acta indefinidamente, así que se firma
        // forzadamente de inmediato y se genera el documento.
        if (notification === null) {
            const adminUsername = (req as any).user?.username || 'system';
            record = await useCases.forceSignMaintenance(
                record.id,
                'Firma forzada automática: el activo no tenía colaborador asignado al completar el mantenimiento.',
                adminUsername
            );

            const { PdfKitService } = require('../../shared/infrastructure/services/PdfKitService');
            const documentService = new PdfKitService();
            const catalogRepo = new (require('../../modules/catalog/infrastructure/PostgresCatalogRepository').PostgresCatalogRepository)(AppDataSource);
            const asset = await catalogRepo.getAssetById(record.assetId);
            let categoryName = 'EQUIPO';
            if (asset && asset.categoryId) {
                const category = await catalogRepo.getCategoryById(asset.categoryId);
                if (category) categoryName = category.name;
            }

            const recordData = serializeRecord(record) as any;
            const signatureText = 'Firma forzada automáticamente por el sistema.\nMotivo: Activo sin colaborador asignado al momento del cierre.';
            const pdfPath = await documentService.generateMaintenanceAct(recordData, asset, signatureText, categoryName);

            await useCases.updatePdfUrl(record.id, pdfPath);
            autoSigned = true;
        }

        res.json({
            ...serializeRecord(record),
            // notification es null cuando no había colaborador en turno que notificar
            notificationSent: notification ? notification.sent : null,
            accountNotFound: notification ? notification.accountNotFound : false,
            notificationError: notification?.error,
            autoSigned
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

// 3.6 Notificar mantenimiento próximo por Webex (disparado por el administrador)
router.post('/:id/notify', async (req, res) => {
    try {
        const record = await repo.findById(req.params.id);
        if (!record) return res.status(404).json({ error: 'Mantenimiento no encontrado' });
        if (record.status !== 'SCHEDULED') {
            return res.status(400).json({ error: 'Solo se pueden notificar mantenimientos en estado Programado.' });
        }

        const assignment = await assignmentAdapter.getActiveAssignmentForAsset(record.assetId);
        if (!assignment || !assignment.collaboratorEmail) {
            return res.status(400).json({ error: 'El activo no tiene un colaborador asignado a quien notificar.' });
        }

        const { PostgresCatalogRepository } = require('../../modules/catalog/infrastructure/PostgresCatalogRepository');
        const catalogRepo = new PostgresCatalogRepository(AppDataSource);
        const asset = await catalogRepo.getAssetById(record.assetId);
        const hostname = asset?.dynamicAttributes?.hostname || asset?.dynamicAttributes?.Hostname || asset?.dynamicAttributes?.HOSTNAME;

        try {
            await mailerService.sendMaintenanceReminder(assignment.collaboratorEmail, {
                assetId: record.assetId,
                hostname,
                type: record.type,
                scheduledDate: record.scheduledDate,
                reason: record.reason
            });
            res.json({
                message: `Recordatorio enviado por Webex a ${assignment.collaboratorName}.`,
                notificationSent: true,
                accountNotFound: false
            });
        } catch (error: any) {
            const accountNotFound = error?.reason === 'ACCOUNT_NOT_FOUND';
            res.json({
                message: accountNotFound
                    ? `La cuenta de Webex de ${assignment.collaboratorName} no existe. Verifica el correo del colaborador.`
                    : 'No se pudo enviar el recordatorio por Webex. Intenta de nuevo más tarde.',
                notificationSent: false,
                accountNotFound,
                notificationError: error.message
            });
        }
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
        const secret = JWT_SECRET;
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
        const secret = JWT_SECRET;
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
router.post('/sign', validateBody(signSchema), async (req, res) => {
    try {
        const { token, signature } = req.body;
        const jwt = require('jsonwebtoken');
        const secret = JWT_SECRET;
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
router.post('/:id/force-sign', validateBody(forceSignSchema), async (req, res) => {
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

// 10. Generar acta bajo demanda (mantenimientos históricos migrados).
// Guarda las notas editadas del acta y produce el PDF. Pensado para los
// registros cargados por importación, que no tienen notas ni PDF.
const generateActSchema = z.object({
    reason: z.string().optional(),
    startNote: z.string().optional(),
    notes: z.string().optional(),
});
router.post('/:id/generate-act', validateBody(generateActSchema), async (req, res) => {
    try {
        const { reason, startNote, notes } = req.body;

        const record = await useCases.updateActNotes(req.params.id, { reason, startNote, notes });

        const catalogRepo = new (require('../../modules/catalog/infrastructure/PostgresCatalogRepository').PostgresCatalogRepository)(AppDataSource);
        const asset = await catalogRepo.getAssetById(record.assetId);
        let categoryName = 'EQUIPO';
        if (asset && asset.categoryId) {
            const category = await catalogRepo.getCategoryById(asset.categoryId);
            if (category) categoryName = category.name;
        }

        const recordData = serializeRecord(record) as any;
        if (!recordData.collaboratorInTurnName) {
            const activeAssignment = await assignmentAdapter.getActiveAssignmentForAsset(record.assetId);
            if (activeAssignment) {
                recordData.collaboratorInTurnName = activeAssignment.collaboratorName;
                recordData.collaboratorEmail = activeAssignment.collaboratorEmail;
            }
        }

        const migratedNote = record.signatureMetadata?.note || 'Carga masiva de mantenimientos.';
        const signatureText = `Firma forzada por migración histórica.\n${migratedNote}`;
        const pdfPath = await documentService.generateMaintenanceAct(recordData, asset, signatureText, categoryName);

        await useCases.updatePdfUrl(record.id, pdfPath);

        res.json({ message: 'Acta generada', pdfUrl: pdfPath });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export { router as maintenanceRouter };
