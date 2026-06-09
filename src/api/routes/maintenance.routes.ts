import { Router } from 'express';
import { MaintenanceUseCases } from '../../modules/maintenance/application/MaintenanceUseCases';
import { PostgresMaintenanceRepository } from '../../modules/maintenance/infrastructure/PostgresMaintenanceRepository';
import { AppDataSource } from '../../shared/infrastructure/database/postgres';
import { AssignmentUseCases } from '../../modules/assignment/application/AssignmentUseCases';
import { PostgresAssignmentRepository } from '../../modules/assignment/infrastructure/PostgresAssignmentRepository';
import { NodemailerService } from '../../shared/infrastructure/services/NodemailerService';

const router = Router();

// Dependencias
const repo = new PostgresMaintenanceRepository(AppDataSource);
const mailerService = new NodemailerService();

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
        notes: record.notes,
        collaboratorInTurnId: record.collaboratorInTurnId,
        collaboratorInTurnName: record.collaboratorInTurnName,
        signatureToken: record.signatureToken,
        pdfUrl: record.pdfUrl
    };
};

// 1. Crear / Agendar mantenimiento
router.post('/', async (req, res) => {
    try {
        const { assetId, type, scheduledDate, reason } = req.body;
        const result = await useCases.createManualMaintenance({ assetId, type, scheduledDate: new Date(scheduledDate), reason });
        res.status(201).json(serializeRecord(result));
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// 2. Iniciar mantenimiento
router.post('/:id/start', async (req, res) => {
    try {
        const { reason } = req.body;
        const result = await useCases.startMaintenance(req.params.id, reason);
        res.json(serializeRecord(result));
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// 3. Completar mantenimiento
router.post('/:id/complete', async (req, res) => {
    try {
        const { notes } = req.body;
        const result = await useCases.completeMaintenance(req.params.id, notes);
        res.json(serializeRecord(result));
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

// 7. Firmar acta (Público)
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

        // Generate PDF
        const pdfPath = await documentService.generateMaintenanceAct(record, asset, signature);
        
        await useCases.updatePdfUrl(record.id, pdfPath);
        
        res.json({ message: 'Firmado correctamente', pdfUrl: pdfPath });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export { router as maintenanceRouter };
