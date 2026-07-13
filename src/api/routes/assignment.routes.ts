import { Router } from 'express';
import { AssignmentUseCases } from '../../modules/assignment/application/AssignmentUseCases';
import { PostgresAssignmentRepository } from '../../modules/assignment/infrastructure/PostgresAssignmentRepository';
import { WebexNotificationService } from '../../shared/infrastructure/services/WebexNotificationService';
import { NotificationError, NotificationResult } from '../../shared/contracts/NotificationError';
import { PdfKitService } from '../../shared/infrastructure/services/PdfKitService';
import express from 'express';
import { CatalogUseCases } from '../../modules/catalog/application/CatalogUseCases';
import { PostgresCatalogRepository } from '../../modules/catalog/infrastructure/PostgresCatalogRepository';
import { PostgresCollaboratorRepository } from '../../modules/collaborator/infrastructure/PostgresCollaboratorRepository';
import { PostgresDepartmentRepository } from '../../modules/collaborator/infrastructure/PostgresDepartmentRepository';
import { CollaboratorHistory } from '../../modules/collaborator/domain/CollaboratorHistory';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../../shared/infrastructure/database/postgres';

const router = Router();

const assignmentRepo = new PostgresAssignmentRepository();
const mailerService = new WebexNotificationService();
const documentService = new PdfKitService();
const assignmentUseCases = new AssignmentUseCases(assignmentRepo, mailerService);

const catalogRepo = new PostgresCatalogRepository();
const catalogUseCases = new CatalogUseCases(catalogRepo);

const collaboratorRepo = new PostgresCollaboratorRepository();
const departmentRepo = new PostgresDepartmentRepository();

/**
 * Envía una notificación de Webex sin romper el flujo: el token de firma ya
 * está persistido antes de llamar aquí, por lo que un fallo de envío (cuenta
 * inexistente, usuario sin red, API caída) NO invalida el enlace — solo se
 * reporta al frontend para que el administrador decida (reenviar, corregir, etc.).
 */
async function trySendNotification(send: () => Promise<void>): Promise<NotificationResult> {
    try {
        await send();
        return { sent: true, accountNotFound: false };
    } catch (error: any) {
        const accountNotFound = error instanceof NotificationError && error.reason === 'ACCOUNT_NOT_FOUND';
        console.error(`❌ Notificación de Webex no enviada${accountNotFound ? ' (cuenta no encontrada)' : ''}: ${error.message}`);
        return { sent: false, accountNotFound, error: error.message };
    }
}

/**
 * Mensaje estándar para el frontend según el resultado del envío.
 */
function notificationMessage(result: NotificationResult, email: string, successMsg: string): string {
    if (result.sent) return successMsg;
    if (result.accountNotFound) {
        return `La cuenta de Webex "${email}" no existe. El proceso quedó registrado y el enlace de firma sigue vigente: usa "Reenviar enlace" cuando el destinatario sea correcto.`;
    }
    return 'El proceso quedó registrado, pero la notificación de Webex no pudo enviarse. El enlace de firma sigue vigente: usa "Reenviar enlace" para intentarlo de nuevo.';
}

/**
 * Determina el tipo de acta de devolución:
 * - PAZ_Y_SALVO: al colaborador no le queda ningún activo tras devolver los indicados.
 * - DEVOLUCION: devolución parcial (conserva al menos un activo asignado o en proceso).
 */
async function resolveReturnMode(collaboratorId: string, excludeAssignmentIds: string[], repo: PostgresAssignmentRepository = assignmentRepo): Promise<'PAZ_Y_SALVO' | 'DEVOLUCION'> {
    const allActive = await repo.findAllActive();
    const remaining = allActive.filter(a =>
        a.collaboratorId === collaboratorId && !excludeAssignmentIds.includes(a.id)
    );
    return remaining.length === 0 ? 'PAZ_Y_SALVO' : 'DEVOLUCION';
}

async function getOtherAssignedAssets(collaboratorId: string, currentAssignmentId: string, repo: PostgresAssignmentRepository = assignmentRepo, catalogUC: CatalogUseCases = catalogUseCases) {
    const allAssignments = await repo.findAllActive();
    const otherAssignments = allAssignments.filter(a => a.collaboratorId === collaboratorId && a.id !== currentAssignmentId && a.status === 'ACCEPTED');
    const otherAssignedAssets = [];
    const allCategories = await catalogUC.getAllCategories();
    for (const a of otherAssignments) {
        const ast = await catalogUC.getAssetById(a.assetId);
        if (ast) {
            const cat = allCategories.find(c => c.id === ast.categoryId);
            otherAssignedAssets.push({
                placa: ast.id,
                host: (ast.dynamicAttributes?.hostname || ast.dynamicAttributes?.Hostname) || 'N/A',
                cat: cat ? cat.name : 'N/A',
                marca: (ast.dynamicAttributes?.marca || ast.dynamicAttributes?.Marca || ast.dynamicAttributes?.brand || ast.dynamicAttributes?.Brand) || 'Generico',
                serial: ast.serial || 'N/A',
                modelo: (ast.dynamicAttributes?.modelo || ast.dynamicAttributes?.Modelo || ast.dynamicAttributes?.model || ast.dynamicAttributes?.Model) || 'Generico'
            });
        }
    }
    return otherAssignedAssets;
}

async function generateDraftPdf(
    assignment: any,
    actType: 'ASSIGNMENT' | 'RETURN',
    fallbackName?: string,
    overrides?: { ipAddress?: string; isForcedSignature?: boolean; adminApproval?: { approvedBy: string; approvedAt: Date | string; note?: string } }
): Promise<string> {
    const asset = await catalogUseCases.getAssetById(assignment.assetId);
    const allCategories = await catalogUseCases.getAllCategories();
    const category = asset ? allCategories.find(c => c.id === asset.categoryId) : null;
    const requiresPlaca = category ? category.schemaDefinition.requiresPlacaIkusi !== false : true;
    
    const collaborator = await collaboratorRepo.findById(assignment.collaboratorId);
    const ceco = collaborator && collaborator.dynamicAttributes ? collaborator.dynamicAttributes['CECOS'] || collaborator.dynamicAttributes['cecos'] || collaborator.dynamicAttributes['CECO'] || 'N/A' : 'N/A';
    const sede = collaborator ? collaborator.location : 'N/A';
    const realColName = collaborator ? collaborator.name : (fallbackName || assignment.collaboratorId);
    const realColEmail = collaborator ? collaborator.email : 'test@ikusi.com';
    let realDept = 'Sistemas';
    if (collaborator && collaborator.department) {
        try {
            const dept = await departmentRepo.findById(Number(collaborator.department));
            if (dept) realDept = dept.name;
            else realDept = collaborator.department.toString();
        } catch(e) {
            realDept = collaborator.department.toString();
        }
    }

    const otherAssignedAssets = await getOtherAssignedAssets(assignment.collaboratorId, assignment.id);
    const returnMode = actType === 'RETURN'
        ? await resolveReturnMode(assignment.collaboratorId, [assignment.id])
        : undefined;

    return await documentService.generateAssignmentAct({
        otherAssignedAssets,
        actType,
        returnMode,
        assignmentId: assignment.id,
        collaboratorName: realColName,
        collaboratorEmail: realColEmail,
        department: realDept,
        ceco: ceco,
        sede: sede,
        assets: [{
            assetId: assignment.assetId,
            assignmentDate: assignment.startDate,
            assetSerial: asset ? (asset.serial || 'N/A') : 'N/A',
            assetType: category ? category.name : 'Laptop',
            assetBrand: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.marca || asset.dynamicAttributes.Marca || asset.dynamicAttributes.brand || asset.dynamicAttributes.Brand) || 'Generico' : 'Generico',
            assetHostname: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.hostname || asset.dynamicAttributes.Hostname) || 'N/A' : 'N/A',
            assetVersionOs: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.versionOs || asset.dynamicAttributes.VersionOS || asset.dynamicAttributes['Version OS'] || asset.dynamicAttributes['Versión OS'] || asset.dynamicAttributes['Sistema Operativo'] || asset.dynamicAttributes['Sistema operativo'] || asset.dynamicAttributes['SistemaOperativo'] || asset.dynamicAttributes['OS'] || asset.dynamicAttributes['os']) || 'N/A' : 'N/A',
            assetModel: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.modelo || asset.dynamicAttributes.Modelo) || 'Generico' : 'Generico',
            assetMac: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.macAddress || asset.dynamicAttributes.MacAddress || asset.dynamicAttributes.MAC || asset.dynamicAttributes['MAC Address']) || 'N/A' : 'N/A',
            assetRam: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.ram || asset.dynamicAttributes.RAM || asset.dynamicAttributes.Ram || asset.dynamicAttributes['Memoria RAM']) || 'N/A' : 'N/A',
            assetProcessor: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.processor || asset.dynamicAttributes.Processor || asset.dynamicAttributes.Procesador || asset.dynamicAttributes.procesador) || 'N/A' : 'N/A',
            assetStorage: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.storage || asset.dynamicAttributes.Storage || asset.dynamicAttributes.Almacenamiento || asset.dynamicAttributes.Disco) || 'N/A' : 'N/A',
            requiresPlacaIkusi: typeof requiresPlaca !== 'undefined' ? requiresPlaca : true
        }],
        ipAddress: overrides?.ipAddress ?? 'PENDIENTE DE FIRMA',
        timestamp: new Date(),
        isForcedSignature: overrides?.isForcedSignature ?? false,
        signatureEmail: realColEmail,
        adminApproval: overrides?.adminApproval
    });
}

// 1. Iniciar Asignación
router.post('/', async (req, res) => {
    try {
        const { id, assetId, collaboratorId, collaboratorEmail, collaboratorName, startDate, assignmentType, expectedReturnDate } = req.body;

        // Validación de Dominio: El activo debe existir y estar DISPONIBLE
        const asset = await catalogUseCases.getAssetById(assetId);
        if (!asset) {
            return res.status(404).json({ error: `El activo ${assetId} no existe en el catálogo.` });
        }
        if (asset.status !== 'AVAILABLE') {
            return res.status(400).json({ error: `El activo ${assetId} no se puede asignar porque su estado actual es: ${asset.status}` });
        }

        const { assignment, token } = await assignmentUseCases.createAssignment(id, assetId, collaboratorId, collaboratorEmail, startDate, assignmentType, expectedReturnDate);

        const documentPath = await generateDraftPdf(assignment, 'ASSIGNMENT', collaboratorName);

        // La asignación y su token ya quedaron persistidos (PENDING_ACCEPTANCE).
        // Un fallo en Webex no invalida el enlace de firma.
        const notification = await trySendNotification(() =>
            mailerService.sendAssignmentEmail(collaboratorEmail, assignment.id, token, documentPath)
        );

        res.status(201).json({
            message: notificationMessage(notification, collaboratorEmail, 'Asignación iniciada y notificación de Webex enviada exitosamente.'),
            assignmentId: assignment.id,
            status: assignment.status,
            notificationSent: notification.sent,
            accountNotFound: notification.accountNotFound,
            notificationError: notification.error
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Listar todas las asignaciones activas
const toAssignmentDto = (a: any) => ({
    id: a.id,
    assetId: a.assetId,
    collaboratorId: a.collaboratorId,
    status: a.status,
    assignmentType: a.assignmentType,
    startDate: a.startDate,
    endDate: a.endDate,
    expectedReturnDate: a.expectedReturnDate,
    lastAlertSentAt: a.lastAlertSentAt,
    documentPath: a.props.documentPath
});

// Paginación opcional vía ?page=&limit= (compatible hacia atrás: sin esos
// parámetros devuelve el arreglo completo, igual que antes). La lista base ya
// está acotada a asignaciones activas, por lo que paginar en memoria es aceptable.
router.get('/', async (req, res) => {
    try {
        const assignments = await assignmentUseCases.getAllActiveAssignments();
        if (req.query.page || req.query.limit) {
            const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
            const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
            const start = (page - 1) * limit;
            const items = assignments.slice(start, start + limit);
            return res.json({ data: items.map(toAssignmentDto), total: assignments.length, page, limit });
        }
        res.json(assignments.map(toAssignmentDto));
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Préstamos próximos a vencer (o ya vencidos) dentro de N días
router.get('/loans/due-within', async (req, res) => {
    try {
        const days = parseInt(req.query.days as string, 10);
        if (Number.isNaN(days) || days < 0) {
            return res.status(400).json({ error: 'El parámetro "days" debe ser un número mayor o igual a 0.' });
        }
        const loans = await assignmentUseCases.getLoansDueWithinDays(days);
        res.json(loans.map(a => ({
            id: a.id,
            assetId: a.assetId,
            collaboratorId: a.collaboratorId,
            status: a.status,
            expectedReturnDate: a.expectedReturnDate,
            lastAlertSentAt: a.lastAlertSentAt
        })));
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Extender la fecha de devolución de un préstamo activo (reinicia su alerta de vencimiento)
router.post('/:id/extend-loan', async (req, res) => {
    try {
        const { newReturnDate } = req.body || {};
        if (!newReturnDate) {
            return res.status(400).json({ error: 'newReturnDate es obligatorio.' });
        }
        const assignment = await assignmentUseCases.extendLoanReturnDate(req.params.id, newReturnDate);
        res.json({
            message: 'Fecha de devolución del préstamo extendida.',
            assignmentId: assignment.id,
            expectedReturnDate: assignment.expectedReturnDate,
            lastAlertSentAt: assignment.lastAlertSentAt
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Iniciar devolución
router.post('/:id/return', async (req, res) => {
    try {
        const { email } = req.body || {};
        const existing = await assignmentRepo.findById(req.params.id);
        const collaborator = existing ? await collaboratorRepo.findById(existing.collaboratorId) : null;
        const realEmail = email || (collaborator ? collaborator.email : 'test@ikusi.com');
        const { assignment, token } = await assignmentUseCases.initiateReturn(req.params.id, realEmail);

        const documentPath = await generateDraftPdf(assignment, 'RETURN');
        const notification = await trySendNotification(() =>
            mailerService.sendReturnEmail(realEmail, assignment.id, token, documentPath)
        );

        res.json({
            assignmentId: assignment.id,
            status: assignment.status,
            message: notificationMessage(notification, realEmail, 'Devolución iniciada y notificación de Webex enviada exitosamente.'),
            notificationSent: notification.sent,
            accountNotFound: notification.accountNotFound,
            notificationError: notification.error
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Iniciar devolución por Asset ID
router.post('/return-by-asset/:assetId', async (req, res) => {
    try {
        const { collaboratorName } = req.body || {};
        const { email } = req.body || {};
        const existing = await assignmentRepo.findCurrentByAssetId(req.params.assetId);
        const collaborator = existing ? await collaboratorRepo.findById(existing.collaboratorId) : null;
        const realEmail = email || (collaborator ? collaborator.email : 'test@ikusi.com');
        const { assignment, token } = await assignmentUseCases.initiateReturnByAsset(req.params.assetId, realEmail);
        
        const documentPath = await generateDraftPdf(assignment, 'RETURN', collaboratorName);
        const notification = await trySendNotification(() =>
            mailerService.sendReturnEmail(realEmail, assignment.id, token, documentPath)
        );

        res.json({
            assignmentId: assignment.id,
            status: assignment.status,
            message: notificationMessage(notification, realEmail, 'Devolución iniciada y notificación de Webex enviada exitosamente.'),
            notificationSent: notification.sent,
            accountNotFound: notification.accountNotFound,
            notificationError: notification.error
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Visto bueno del administrador sobre una devolución firmada
router.post('/:id/approve-return', async (req, res) => {
    try {
        const { note } = req.body || {};
        const approvedBy = (req as any).user?.username || 'Administrador TI';

        const assignment = await assignmentUseCases.approveReturn(req.params.id, approvedBy, note);

        // Visto Bueno otorgado: el activo se libera y vuelve a estar disponible.
        await catalogUseCases.changeAssetStatus(assignment.assetId, 'AVAILABLE');

        // Regenerar el acta de devolución incluyendo el visto bueno.
        // Se conserva la evidencia de firma original (metadata almacenada).
        const collaborator = await collaboratorRepo.findById(assignment.collaboratorId);
        const signedIp = assignment.signatureMetadata?.ipAddress || 'Firma registrada';
        const wasForced = typeof signedIp === 'string' && signedIp.includes('Firma forzada');
        const documentPath = await generateDraftPdf(assignment, 'RETURN', collaborator?.name, {
            ipAddress: signedIp,
            isForcedSignature: wasForced,
            adminApproval: assignment.adminApproval
        });
        await assignmentUseCases.updateDocumentPath(assignment.id, documentPath);

        await collaboratorRepo.saveHistory(new CollaboratorHistory(
            uuidv4(),
            assignment.collaboratorId,
            'ASSET_RETURNED' as any,
            new Date(),
            `Visto bueno de TI sobre la devolución del activo ${assignment.assetId} (por ${approvedBy})${note ? `: ${note}` : ''}`
        ));

        res.json({
            message: 'Visto bueno registrado y acta actualizada.',
            assignmentId: assignment.id,
            adminApproval: assignment.adminApproval,
            documentPath
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Reenviar Link de Firma
router.post('/:id/resend-link', async (req, res) => {
    try {
        const { email } = req.body || {};
        const existing = await assignmentRepo.findById(req.params.id);
        const collaborator = existing ? await collaboratorRepo.findById(existing.collaboratorId) : null;
        const realEmail = email || (collaborator ? collaborator.email : 'test@ikusi.com');
        const { assignment, token } = await assignmentUseCases.resendLink(req.params.id, realEmail);

        const actType = assignment.status === 'PENDING_ACCEPTANCE' ? 'ASSIGNMENT' : 'RETURN';
        const documentPath = await generateDraftPdf(assignment, actType);

        const notification = await trySendNotification(() => actType === 'ASSIGNMENT'
            ? mailerService.sendAssignmentEmail(realEmail, assignment.id, token, documentPath)
            : mailerService.sendReturnEmail(realEmail, assignment.id, token, documentPath)
        );

        res.json({
            message: notificationMessage(notification, realEmail, 'Enlace reenviado exitosamente por Webex.'),
            notificationSent: notification.sent,
            accountNotFound: notification.accountNotFound,
            notificationError: notification.error
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/resend-link-by-asset/:assetId', async (req, res) => {
    try {
        const { email } = req.body || {};
        const existing = await assignmentRepo.findCurrentByAssetId(req.params.assetId);
        if (!existing) throw new Error('No se encontró asignación activa');
        const collaborator = await collaboratorRepo.findById(existing.collaboratorId);
        const realEmail = email || (collaborator ? collaborator.email : 'test@ikusi.com');
        const { assignment, token } = await assignmentUseCases.resendLink(existing.id, realEmail);

        const actType = assignment.status === 'PENDING_ACCEPTANCE' ? 'ASSIGNMENT' : 'RETURN';
        const documentPath = await generateDraftPdf(assignment, actType);

        const notification = await trySendNotification(() => actType === 'ASSIGNMENT'
            ? mailerService.sendAssignmentEmail(realEmail, assignment.id, token, documentPath)
            : mailerService.sendReturnEmail(realEmail, assignment.id, token, documentPath)
        );

        res.json({
            message: notificationMessage(notification, realEmail, 'Enlace reenviado exitosamente por Webex.'),
            notificationSent: notification.sent,
            accountNotFound: notification.accountNotFound,
            notificationError: notification.error
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Devolución Forzada (Administrativa)
router.post('/:id/force-return', async (req, res) => {
    try {
        const reason = req.body.reason || 'Firma forzada administrativa';
        const ipAddress = `Firma forzada por administrador.\nMotivo: ${reason}`;

        // Devolución + cambio de estado del activo + acta + historial en una sola
        // transacción: si falla algo (incluida la generación del PDF), no debe
        // quedar el activo marcado como devuelto sin su acta correspondiente.
        const { documentPath } = await AppDataSource.manager.transaction(async (manager) => {
            const txAssignmentRepo = new PostgresAssignmentRepository(manager);
            const txAssignmentUseCases = new AssignmentUseCases(txAssignmentRepo, mailerService);
            const txCatalogRepo = new PostgresCatalogRepository(manager);
            const txCatalogUseCases = new CatalogUseCases(txCatalogRepo);
            const txCollaboratorRepo = new PostgresCollaboratorRepository(manager);

            const returnedAssignment = await txAssignmentUseCases.forceReturn(req.params.id, ipAddress);

            // El activo queda bloqueado hasta que TI otorgue el Visto Bueno (approve-return)
            await txCatalogUseCases.changeAssetStatus(returnedAssignment.assetId, 'PENDING_INSPECTION');

            // Generar PDF de Paz y Salvo Administrativo
            const asset = await txCatalogUseCases.getAssetById(returnedAssignment.assetId);
            const category = asset ? await txCatalogRepo.getCategoryById(asset.categoryId) : null;
            const requiresPlaca = category ? category.schemaDefinition.requiresPlacaIkusi !== false : true;
            const collaborator = await txCollaboratorRepo.findById(returnedAssignment.collaboratorId);
            const ceco = collaborator && collaborator.dynamicAttributes ? collaborator.dynamicAttributes['CECOS'] || collaborator.dynamicAttributes['cecos'] || collaborator.dynamicAttributes['CECO'] || 'N/A' : 'N/A';
            const sede = collaborator ? collaborator.location : 'N/A';
            const realColName = collaborator ? collaborator.name : returnedAssignment.collaboratorId;
            const realColEmail = collaborator ? collaborator.email : 'test@ikusi.com';
            let realDept = 'Sistemas';
            if (collaborator && collaborator.department) {
                try {
                    const dept = await departmentRepo.findById(Number(collaborator.department));
                    if (dept) realDept = dept.name;
                    else realDept = collaborator.department.toString();
                } catch(e) {
                    realDept = collaborator.department.toString();
                }
            }

            const otherAssignedAssets = await getOtherAssignedAssets(returnedAssignment.collaboratorId, returnedAssignment.id, txAssignmentRepo, txCatalogUseCases);
            const returnMode = await resolveReturnMode(returnedAssignment.collaboratorId, [returnedAssignment.id], txAssignmentRepo);

            const documentPath = await documentService.generateAssignmentAct({
                otherAssignedAssets,
                actType: 'RETURN',
                returnMode,
                assignmentId: returnedAssignment.id,
                collaboratorName: realColName,
                collaboratorEmail: realColEmail,
                department: realDept,
                ceco: ceco,
                sede: sede,
                assets: [{
                assetId: returnedAssignment.assetId,
                assignmentDate: returnedAssignment.startDate,
                assetSerial: asset ? (asset.serial || 'N/A') : 'N/A',
                assetType: category ? category.name : 'Laptop',
                assetBrand: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.marca || asset.dynamicAttributes.Marca || asset.dynamicAttributes.brand || asset.dynamicAttributes.Brand) || 'Generico' : 'Generico',
                assetHostname: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.hostname || asset.dynamicAttributes.Hostname) || 'N/A' : 'N/A',
                assetVersionOs: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.versionOs || asset.dynamicAttributes.VersionOS || asset.dynamicAttributes['Version OS'] || asset.dynamicAttributes['Versión OS'] || asset.dynamicAttributes['Sistema Operativo'] || asset.dynamicAttributes['Sistema operativo'] || asset.dynamicAttributes['SistemaOperativo'] || asset.dynamicAttributes['OS'] || asset.dynamicAttributes['os']) || 'N/A' : 'N/A',
                assetModel: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.modelo || asset.dynamicAttributes.Modelo) || 'Generico' : 'Generico',
                assetMac: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.macAddress || asset.dynamicAttributes.MacAddress || asset.dynamicAttributes.MAC || asset.dynamicAttributes['MAC Address']) || 'N/A' : 'N/A',
                assetRam: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.ram || asset.dynamicAttributes.RAM || asset.dynamicAttributes.Ram || asset.dynamicAttributes['Memoria RAM']) || 'N/A' : 'N/A',
                assetProcessor: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.processor || asset.dynamicAttributes.Processor || asset.dynamicAttributes.Procesador || asset.dynamicAttributes.procesador) || 'N/A' : 'N/A',
                assetStorage: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.storage || asset.dynamicAttributes.Storage || asset.dynamicAttributes.Almacenamiento || asset.dynamicAttributes.Disco) || 'N/A' : 'N/A',
                requiresPlacaIkusi: typeof requiresPlaca !== 'undefined' ? requiresPlaca : true
            }],
                ipAddress,
                timestamp: new Date(),
                isForcedSignature: req.path.includes('force') ? true : false,
                signatureEmail: req.body && req.body.email ? req.body.email : realColEmail
            });

            await txAssignmentUseCases.updateDocumentPath(returnedAssignment.id, documentPath);

            await txCollaboratorRepo.saveHistory(new CollaboratorHistory(
                uuidv4(),
                returnedAssignment.collaboratorId,
                'ASSET_RETURNED' as any,
                new Date(),
                `Activo ${returnedAssignment.assetId} devuelto forzadamente`
            ));

            return { documentPath };
        });

        res.json({ message: 'Devolución forzada exitosa', documentPath });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/force-return-by-asset/:assetId', async (req, res) => {
    try {
        const { email, collaboratorName } = req.body || {};
        const reason = req.body?.reason || 'Firma forzada administrativa';
        const ipAddress = `Firma forzada por administrador.\nMotivo: ${reason}`;

        const { documentPath } = await AppDataSource.manager.transaction(async (manager) => {
            const txAssignmentRepo = new PostgresAssignmentRepository(manager);
            const txAssignmentUseCases = new AssignmentUseCases(txAssignmentRepo, mailerService);
            const txCatalogRepo = new PostgresCatalogRepository(manager);
            const txCatalogUseCases = new CatalogUseCases(txCatalogRepo);
            const txCollaboratorRepo = new PostgresCollaboratorRepository(manager);

            const assignment = await txAssignmentRepo.findCurrentByAssetId(req.params.assetId);
            if (!assignment) throw new Error('No se encontró asignación activa o pendiente');
            const returnedAssignment = await txAssignmentUseCases.forceReturn(assignment.id, ipAddress);

            // El activo queda bloqueado hasta que TI otorgue el Visto Bueno (approve-return)
            await txCatalogUseCases.changeAssetStatus(returnedAssignment.assetId, 'PENDING_INSPECTION');

            const asset = await txCatalogUseCases.getAssetById(returnedAssignment.assetId);
            const category = asset ? await txCatalogRepo.getCategoryById(asset.categoryId) : null;
            const requiresPlaca = category ? category.schemaDefinition.requiresPlacaIkusi !== false : true;
            const collaborator = await txCollaboratorRepo.findById(returnedAssignment.collaboratorId);
            const ceco = collaborator && collaborator.dynamicAttributes ? collaborator.dynamicAttributes['CECOS'] || collaborator.dynamicAttributes['cecos'] || collaborator.dynamicAttributes['CECO'] || 'N/A' : 'N/A';
            const sede = collaborator ? collaborator.location : 'N/A';
            const realColName = collaborator ? collaborator.name : (collaboratorName || returnedAssignment.collaboratorId);
            const realColEmail = collaborator ? collaborator.email : 'test@ikusi.com';
            let realDept = 'Sistemas';
            if (collaborator && collaborator.department) {
                try {
                    const dept = await departmentRepo.findById(Number(collaborator.department));
                    if (dept) realDept = dept.name;
                    else realDept = collaborator.department.toString();
                } catch(e) {
                    realDept = collaborator.department.toString();
                }
            }

            const otherAssignedAssets = await getOtherAssignedAssets(returnedAssignment.collaboratorId, returnedAssignment.id, txAssignmentRepo, txCatalogUseCases);
            const returnMode = await resolveReturnMode(returnedAssignment.collaboratorId, [returnedAssignment.id], txAssignmentRepo);

            const documentPath = await documentService.generateAssignmentAct({
                otherAssignedAssets,
                actType: 'RETURN',
                returnMode,
                assignmentId: returnedAssignment.id,
                collaboratorName: realColName,
                collaboratorEmail: realColEmail,
                department: realDept,
                ceco: ceco,
                sede: sede,
                returnReason: reason,
                assets: [{
                assetId: returnedAssignment.assetId,
                assignmentDate: returnedAssignment.startDate,
                assetSerial: asset ? (asset.serial || 'N/A') : 'N/A',
                assetType: category ? category.name : 'Laptop',
                assetBrand: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.marca || asset.dynamicAttributes.Marca || asset.dynamicAttributes.brand || asset.dynamicAttributes.Brand) || 'Generico' : 'Generico',
                assetHostname: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.hostname || asset.dynamicAttributes.Hostname) || 'N/A' : 'N/A',
                assetVersionOs: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.versionOs || asset.dynamicAttributes.VersionOS || asset.dynamicAttributes['Version OS'] || asset.dynamicAttributes['Versión OS'] || asset.dynamicAttributes['Sistema Operativo'] || asset.dynamicAttributes['Sistema operativo'] || asset.dynamicAttributes['SistemaOperativo'] || asset.dynamicAttributes['OS'] || asset.dynamicAttributes['os']) || 'N/A' : 'N/A',
                assetModel: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.modelo || asset.dynamicAttributes.Modelo) || 'Generico' : 'Generico',
                assetMac: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.macAddress || asset.dynamicAttributes.MacAddress || asset.dynamicAttributes.MAC || asset.dynamicAttributes['MAC Address']) || 'N/A' : 'N/A',
                assetRam: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.ram || asset.dynamicAttributes.RAM || asset.dynamicAttributes.Ram || asset.dynamicAttributes['Memoria RAM']) || 'N/A' : 'N/A',
                assetProcessor: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.processor || asset.dynamicAttributes.Processor || asset.dynamicAttributes.Procesador || asset.dynamicAttributes.procesador) || 'N/A' : 'N/A',
                assetStorage: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.storage || asset.dynamicAttributes.Storage || asset.dynamicAttributes.Almacenamiento || asset.dynamicAttributes.Disco) || 'N/A' : 'N/A',
                requiresPlacaIkusi: typeof requiresPlaca !== 'undefined' ? requiresPlaca : true
            }],
                ipAddress,
                timestamp: new Date(),
                isForcedSignature: req.path.includes('force') ? true : false,
                signatureEmail: req.body && req.body.email ? req.body.email : realColEmail
            });

            await txAssignmentUseCases.updateDocumentPath(returnedAssignment.id, documentPath);

            await txCollaboratorRepo.saveHistory(new CollaboratorHistory(
                uuidv4(),
                returnedAssignment.collaboratorId,
                'ASSET_RETURNED' as any,
                new Date(),
                `Activo ${returnedAssignment.assetId} devuelto forzadamente`
            ));

            return { documentPath };
        });

        res.json({ message: 'Devolución forzada exitosa', documentPath });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Aceptación Forzada (Administrativa)
router.post('/force-accept-by-asset/:assetId', async (req, res) => {
    try {
        const { email, collaboratorName } = req.body || {};
        const reason = req.body?.reason || 'Firma forzada administrativa';
        const ipAddress = `Firma forzada por administrador.\nMotivo: ${reason}`;
        const assignment = await assignmentRepo.findCurrentByAssetId(req.params.assetId);
        if (!assignment) throw new Error('No se encontró asignación para forzar aceptación');
        const acceptedAssignment = await assignmentUseCases.forceAccept(assignment.id, ipAddress);
        
        await catalogUseCases.changeAssetStatus(acceptedAssignment.assetId, 'IN_USE');

        const asset = await catalogUseCases.getAssetById(acceptedAssignment.assetId);
        const category = asset ? await catalogRepo.getCategoryById(asset.categoryId) : null;
        const requiresPlaca = category ? category.schemaDefinition.requiresPlacaIkusi !== false : true;
        
        const collaborator = await collaboratorRepo.findById(acceptedAssignment.collaboratorId);
        const ceco = collaborator && collaborator.dynamicAttributes ? collaborator.dynamicAttributes['CECOS'] || collaborator.dynamicAttributes['cecos'] || collaborator.dynamicAttributes['CECO'] || 'N/A' : 'N/A';
        const sede = collaborator ? collaborator.location : 'N/A';
        const realColName = collaborator ? collaborator.name : (collaboratorName || acceptedAssignment.collaboratorId);
        const realColEmail = collaborator ? collaborator.email : 'test@ikusi.com';
        let realDept = 'Sistemas';
        if (collaborator && collaborator.department) {
            try {
                const dept = await departmentRepo.findById(Number(collaborator.department));
                if (dept) realDept = dept.name;
                else realDept = collaborator.department.toString();
            } catch(e) {
                realDept = collaborator.department.toString();
            }
        }

        const otherAssignedAssets = await getOtherAssignedAssets(acceptedAssignment.collaboratorId, acceptedAssignment.id);

        const documentPath = await documentService.generateAssignmentAct({
            otherAssignedAssets,
            actType: 'ASSIGNMENT',
            assignmentId: acceptedAssignment.id,
            collaboratorName: realColName,
            collaboratorEmail: realColEmail,
            department: realDept,
            ceco: ceco,
            sede: sede,
            returnReason: reason,
            assets: [{
            assetId: acceptedAssignment.assetId,
            assignmentDate: acceptedAssignment.startDate,
            assetSerial: asset ? (asset.serial || 'N/A') : 'N/A',
            assetType: category ? category.name : 'Laptop',
            assetBrand: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.marca || asset.dynamicAttributes.Marca || asset.dynamicAttributes.brand || asset.dynamicAttributes.Brand) || 'Generico' : 'Generico',
            assetHostname: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.hostname || asset.dynamicAttributes.Hostname) || 'N/A' : 'N/A',
            assetVersionOs: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.versionOs || asset.dynamicAttributes.VersionOS || asset.dynamicAttributes['Version OS'] || asset.dynamicAttributes['Versión OS'] || asset.dynamicAttributes['Sistema Operativo'] || asset.dynamicAttributes['Sistema operativo'] || asset.dynamicAttributes['SistemaOperativo'] || asset.dynamicAttributes['OS'] || asset.dynamicAttributes['os']) || 'N/A' : 'N/A',
            assetModel: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.modelo || asset.dynamicAttributes.Modelo) || 'Generico' : 'Generico',
            assetMac: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.macAddress || asset.dynamicAttributes.MacAddress || asset.dynamicAttributes.MAC || asset.dynamicAttributes['MAC Address']) || 'N/A' : 'N/A',
            assetRam: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.ram || asset.dynamicAttributes.RAM || asset.dynamicAttributes.Ram || asset.dynamicAttributes['Memoria RAM']) || 'N/A' : 'N/A',
            assetProcessor: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.processor || asset.dynamicAttributes.Processor || asset.dynamicAttributes.Procesador || asset.dynamicAttributes.procesador) || 'N/A' : 'N/A',
            assetStorage: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.storage || asset.dynamicAttributes.Storage || asset.dynamicAttributes.Almacenamiento || asset.dynamicAttributes.Disco) || 'N/A' : 'N/A',
            requiresPlacaIkusi: typeof requiresPlaca !== 'undefined' ? requiresPlaca : true
        }],
            ipAddress,
            timestamp: new Date(),
            isForcedSignature: req.path.includes('force') ? true : false,
            signatureEmail: req.body && req.body.email ? req.body.email : realColEmail
        });

        await assignmentUseCases.updateDocumentPath(acceptedAssignment.id, documentPath);
        
        await collaboratorRepo.saveHistory(new CollaboratorHistory(
            uuidv4(),
            acceptedAssignment.collaboratorId,
            'ASSET_ASSIGNED' as any,
            new Date(),
            `Activo ${acceptedAssignment.assetId} asignado forzadamente`
        ));

        res.json({ message: 'Aceptación forzada exitosa', documentPath });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Confirmar devolución (Firma del Paz y Salvo)
router.get('/:id/confirm-return', async (req, res) => {
    try {
        const assignmentId = req.params.id;
        const token = req.query.token as string;
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        if (!token) {
            return res.status(400).send('Token no proporcionado');
        }

        const returnedAssignment = await assignmentUseCases.confirmReturn(assignmentId, token, ipAddress, userAgent);

        // El activo queda bloqueado hasta que TI otorgue el Visto Bueno (approve-return)
        await catalogUseCases.changeAssetStatus(returnedAssignment.assetId, 'PENDING_INSPECTION');

        // Buscar activo para poblar el PDF
                const asset = await catalogUseCases.getAssetById(returnedAssignment.assetId);
        const category = asset ? await catalogRepo.getCategoryById(asset.categoryId) : null;
        const requiresPlaca = category ? category.schemaDefinition.requiresPlacaIkusi !== false : true;
        
        // Generar PDF de Paz y Salvo
        const collaborator = await collaboratorRepo.findById(returnedAssignment.collaboratorId);
        const ceco = collaborator && collaborator.dynamicAttributes ? collaborator.dynamicAttributes['CECOS'] || collaborator.dynamicAttributes['cecos'] || collaborator.dynamicAttributes['CECO'] || 'N/A' : 'N/A';
        const sede = collaborator ? collaborator.location : 'N/A';
        const realColName = collaborator ? collaborator.name : returnedAssignment.collaboratorId;
        const realColEmail = collaborator ? collaborator.email : 'test@ikusi.com';
        let realDept = 'Sistemas';
        if (collaborator && collaborator.department) {
            try {
                const dept = await departmentRepo.findById(Number(collaborator.department));
                if (dept) realDept = dept.name;
                else realDept = collaborator.department.toString();
            } catch(e) {
                realDept = collaborator.department.toString();
            }
        }

        const otherAssignedAssets = await getOtherAssignedAssets(returnedAssignment.collaboratorId, returnedAssignment.id);
        const returnMode = await resolveReturnMode(returnedAssignment.collaboratorId, [returnedAssignment.id]);

        const documentPath = await documentService.generateAssignmentAct({
            otherAssignedAssets,
            actType: 'RETURN',
            returnMode,
            assignmentId: returnedAssignment.id,
            collaboratorName: realColName,
            collaboratorEmail: realColEmail,
            department: realDept,
            ceco: ceco,
            sede: sede,
            assets: [{
            assetId: returnedAssignment.assetId,
            assignmentDate: returnedAssignment.startDate,
            assetSerial: asset ? (asset.serial || 'N/A') : 'N/A',
            assetType: category ? category.name : 'Laptop',
            assetBrand: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.marca || asset.dynamicAttributes.Marca || asset.dynamicAttributes.brand || asset.dynamicAttributes.Brand) || 'Generico' : 'Generico',
            assetHostname: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.hostname || asset.dynamicAttributes.Hostname) || 'N/A' : 'N/A',
            assetVersionOs: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.versionOs || asset.dynamicAttributes.VersionOS || asset.dynamicAttributes['Version OS'] || asset.dynamicAttributes['Versión OS'] || asset.dynamicAttributes['Sistema Operativo'] || asset.dynamicAttributes['Sistema operativo'] || asset.dynamicAttributes['SistemaOperativo'] || asset.dynamicAttributes['OS'] || asset.dynamicAttributes['os']) || 'N/A' : 'N/A',
            assetModel: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.modelo || asset.dynamicAttributes.Modelo) || 'Generico' : 'Generico',
            assetMac: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.macAddress || asset.dynamicAttributes.MacAddress || asset.dynamicAttributes.MAC || asset.dynamicAttributes['MAC Address']) || 'N/A' : 'N/A',
            assetRam: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.ram || asset.dynamicAttributes.RAM || asset.dynamicAttributes.Ram || asset.dynamicAttributes['Memoria RAM']) || 'N/A' : 'N/A',
            assetProcessor: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.processor || asset.dynamicAttributes.Processor || asset.dynamicAttributes.Procesador || asset.dynamicAttributes.procesador) || 'N/A' : 'N/A',
            assetStorage: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.storage || asset.dynamicAttributes.Storage || asset.dynamicAttributes.Almacenamiento || asset.dynamicAttributes.Disco) || 'N/A' : 'N/A',
            requiresPlacaIkusi: typeof requiresPlaca !== 'undefined' ? requiresPlaca : true
        }],
            ipAddress,
            timestamp: new Date(),
            isForcedSignature: req.path.includes('force') ? true : false,
            signatureEmail: req.body && req.body.email ? req.body.email : realColEmail
        });

        // Actualizar assignment con el path
        await assignmentUseCases.updateDocumentPath(returnedAssignment.id, documentPath);
        
        await collaboratorRepo.saveHistory(new CollaboratorHistory(
            uuidv4(),
            returnedAssignment.collaboratorId,
            'ASSET_RETURNED' as any,
            new Date(),
            `Activo ${returnedAssignment.assetId} devuelto`
        ));

        res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Devolución Exitosa</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
                <style>
                    body {
                        font-family: 'Inter', sans-serif;
                        background-color: #f9fafb;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                    }
                    .container {
                        background: #ffffff;
                        padding: 40px 50px;
                        border-radius: 12px;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                        text-align: center;
                        max-width: 500px;
                        width: 100%;
                    }
                    .icon {
                        background-color: #fef3c7;
                        color: #d97706;
                        width: 64px;
                        height: 64px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 24px;
                    }
                    .icon svg { width: 32px; height: 32px; }
                    h1 { font-size: 24px; font-weight: 600; margin-bottom: 12px; color: #111827; }
                    p { color: #6b7280; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
                    .details { background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 32px; font-size: 14px; color: #374151; }
                    .btn { display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; transition: background-color 0.2s ease; }
                    .btn:hover { background-color: #374151; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h1>¡Paz y Salvo Generado!</h1>
                    <p>El equipo ha sido devuelto satisfactoriamente. Quedará bloqueado en el inventario hasta que TI otorgue el Visto Bueno de la devolución.</p>
                    <div class="details">
                        <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-CO')}
                    </div>
                    <a href="${process.env.BACKEND_URL || 'http://localhost:3000'}${documentPath}" target="_blank" class="btn">Descargar Paz y Salvo (PDF)</a>
                </div>
            </body>
            </html>
        `);
    } catch (error: any) {
        res.status(400).send(`Error procesando la devolución: ${error.message}`);
    }
});

// 2. Aceptar Asignación (Webhook / Link de Correo)
router.get('/:id/accept', async (req, res) => {
    try {
        const assignmentId = req.params.id;
        const token = req.query.token as string;
        
        // Simulación de captura de IP y User-Agent (En producción detrás de Nginx usar x-forwarded-for)
        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        if (!token) {
            return res.status(400).send('Token de firma es requerido.');
        }

        const acceptedAssignment = await assignmentUseCases.acceptAssignment(assignmentId, token, ipAddress, userAgent);
        
        // Actualizar el estado del activo en el Catálogo a IN_USE
        await catalogUseCases.changeAssetStatus(acceptedAssignment.assetId, 'IN_USE');

        // Buscar activo para poblar el PDF
                const asset = await catalogUseCases.getAssetById(acceptedAssignment.assetId);
        const category = asset ? await catalogRepo.getCategoryById(asset.categoryId) : null;
        const requiresPlaca = category ? category.schemaDefinition.requiresPlacaIkusi !== false : true;
        
        // Generar PDF
        const collaborator = await collaboratorRepo.findById(acceptedAssignment.collaboratorId);
        const ceco = collaborator && collaborator.dynamicAttributes ? collaborator.dynamicAttributes['CECOS'] || collaborator.dynamicAttributes['cecos'] || collaborator.dynamicAttributes['CECO'] || 'N/A' : 'N/A';
        const sede = collaborator ? collaborator.location : 'N/A';
        const realColName = collaborator ? collaborator.name : acceptedAssignment.collaboratorId;
        const realColEmail = collaborator ? collaborator.email : 'test@ikusi.com';
        let realDept = 'Sistemas';
        if (collaborator && collaborator.department) {
            try {
                const dept = await departmentRepo.findById(Number(collaborator.department));
                if (dept) realDept = dept.name;
                else realDept = collaborator.department.toString();
            } catch(e) {
                realDept = collaborator.department.toString();
            }
        }

        const otherAssignedAssets = await getOtherAssignedAssets(acceptedAssignment.collaboratorId, acceptedAssignment.id);

        const documentPath = await documentService.generateAssignmentAct({
            otherAssignedAssets,
            actType: 'ASSIGNMENT',
            assignmentId: acceptedAssignment.id,
            collaboratorName: realColName,
            collaboratorEmail: realColEmail,
            department: realDept,
            ceco: ceco,
            sede: sede,
            assets: [{
            assetId: acceptedAssignment.assetId,
            assignmentDate: acceptedAssignment.startDate,
            assetSerial: asset ? (asset.serial || 'N/A') : 'N/A',
            assetType: category ? category.name : 'Laptop',
            assetBrand: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.marca || asset.dynamicAttributes.Marca || asset.dynamicAttributes.brand || asset.dynamicAttributes.Brand) || 'Generico' : 'Generico',
            assetHostname: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.hostname || asset.dynamicAttributes.Hostname) || 'N/A' : 'N/A',
            assetVersionOs: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.versionOs || asset.dynamicAttributes.VersionOS || asset.dynamicAttributes['Version OS'] || asset.dynamicAttributes['Versión OS'] || asset.dynamicAttributes['Sistema Operativo'] || asset.dynamicAttributes['Sistema operativo'] || asset.dynamicAttributes['SistemaOperativo'] || asset.dynamicAttributes['OS'] || asset.dynamicAttributes['os']) || 'N/A' : 'N/A',
            assetModel: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.modelo || asset.dynamicAttributes.Modelo) || 'Generico' : 'Generico',
            assetMac: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.macAddress || asset.dynamicAttributes.MacAddress || asset.dynamicAttributes.MAC || asset.dynamicAttributes['MAC Address']) || 'N/A' : 'N/A',
            assetRam: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.ram || asset.dynamicAttributes.RAM || asset.dynamicAttributes.Ram || asset.dynamicAttributes['Memoria RAM']) || 'N/A' : 'N/A',
            assetProcessor: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.processor || asset.dynamicAttributes.Processor || asset.dynamicAttributes.Procesador || asset.dynamicAttributes.procesador) || 'N/A' : 'N/A',
            assetStorage: asset && asset.dynamicAttributes ? (asset.dynamicAttributes.storage || asset.dynamicAttributes.Storage || asset.dynamicAttributes.Almacenamiento || asset.dynamicAttributes.Disco) || 'N/A' : 'N/A',
            requiresPlacaIkusi: typeof requiresPlaca !== 'undefined' ? requiresPlaca : true
        }],
            ipAddress,
            timestamp: new Date(),
            isForcedSignature: req.path.includes('force') ? true : false,
            signatureEmail: req.body && req.body.email ? req.body.email : realColEmail
        });

        // Actualizar assignment con el path
        await assignmentUseCases.updateDocumentPath(acceptedAssignment.id, documentPath);
        
        await collaboratorRepo.saveHistory(new CollaboratorHistory(
            uuidv4(),
            acceptedAssignment.collaboratorId,
            'ASSET_ASSIGNED' as any,
            new Date(),
            `Activo ${acceptedAssignment.assetId} asignado`
        ));

        res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Asignación Aceptada</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
                <style>
                    body {
                        font-family: 'Inter', sans-serif;
                        background-color: #f9fafb;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                    }
                    .container {
                        background: #ffffff;
                        padding: 40px 50px;
                        border-radius: 12px;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                        text-align: center;
                        max-width: 500px;
                        width: 100%;
                    }
                    .icon {
                        background-color: #d1fae5;
                        color: #10b981;
                        width: 64px;
                        height: 64px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 24px;
                    }
                    .icon svg { width: 32px; height: 32px; }
                    h1 { font-size: 24px; font-weight: 600; margin-bottom: 12px; color: #111827; }
                    p { color: #6b7280; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
                    .details { background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 32px; font-size: 14px; color: #374151; }
                    .btn { display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; transition: background-color 0.2s ease; }
                    .btn:hover { background-color: #374151; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h1>Asignación Aceptada</h1>
                    <p>El activo ha sido asignado a tu nombre. Tu firma digital ha sido registrada exitosamente en nuestro sistema.</p>
                    <div class="details">
                        <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-CO')}
                    </div>
                    <a href="${process.env.BACKEND_URL || 'http://localhost:3000'}${documentPath}" target="_blank" class="btn">Descargar Acta Firmada (PDF)</a>
                </div>
            </body>
            </html>
        `);
    } catch (error: any) {
        res.status(400).send(`
            <div style="text-align:center; padding: 50px; font-family: sans-serif;">
                <h1 style="color: red;">❌ Error al aceptar asignación</h1>
                <p>${error.message}</p>
            </div>
        `);
    }
});

// Historial completo de asignaciones de un activo (para Hoja de Vida del Equipo)
router.get('/asset/:assetId/history', async (req, res) => {
    try {
        const { AppDataSource } = require('../../shared/infrastructure/database/postgres');
        const { AssignmentOrmEntity } = require('../../modules/assignment/infrastructure/orm/Assignment.entity');
        const { PostgresCollaboratorRepository } = require('../../modules/collaborator/infrastructure/PostgresCollaboratorRepository');

        const repo = AppDataSource.getRepository(AssignmentOrmEntity);
        const assignments = await repo.find({
            where: { asset_id: req.params.assetId },
            order: { start_date: 'DESC' }
        });

        const collaboratorRepo = new PostgresCollaboratorRepository(AppDataSource);

        const enriched = await Promise.all(assignments.map(async (a: any) => {
            let collaboratorName = a.collaborator_id;
            let collaboratorEmail = '';
            try {
                const collab = await collaboratorRepo.findById(a.collaborator_id);
                if (collab) {
                    collaboratorName = collab.name;
                    collaboratorEmail = collab.email;
                }
            } catch (_) {}
            return {
                id: a.id,
                assetId: a.asset_id,
                collaboratorId: a.collaborator_id,
                collaboratorName,
                collaboratorEmail,
                status: a.status,
                assignmentType: a.assignment_type || 'PERMANENT',
                expectedReturnDate: a.expected_return_date || null,
                lastAlertSentAt: a.last_alert_sent_at || null,
                startDate: a.start_date,
                endDate: a.end_date,
                documentPath: a.document_path || null,
                adminApproval: a.admin_approval || null
            };
        }));

        res.json(enriched);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});


router.post('/batch-return', async (req, res) => {
    try {
        const { assignmentIds, email, reason } = req.body;
        if (!assignmentIds || !Array.isArray(assignmentIds) || assignmentIds.length === 0 || !email) {
            return res.status(400).json({ error: 'Missing required fields (assignmentIds, email)' });
        }

        const { assignments, token } = await assignmentUseCases.initiateBatchReturn(assignmentIds);

        const firstAssignment = assignments[0];
        const collaborator = await collaboratorRepo.findById(firstAssignment.collaboratorId);
        
        let assetsDetails = [];
        for (const id of assignmentIds) {
            const assign = assignments.find(a => a.id === id);
            if (assign) {
                const asset = await catalogUseCases.getAssetById(assign.assetId);
                let category;
                if (asset) category = await catalogRepo.getCategoryById(asset.categoryId);
                
                assetsDetails.push({
                    assetId: assign.assetId,
                    assignmentDate: assign.startDate,
                    assetSerial: asset ? (asset.serial || 'N/A') : 'N/A',
                    assetType: category ? category.name : 'Laptop',
                    assetBrand: asset?.dynamicAttributes?.marca || asset?.dynamicAttributes?.Marca || 'Generico',
                    assetHostname: asset?.dynamicAttributes?.hostname || asset?.dynamicAttributes?.Hostname || 'N/A',
                    assetVersionOs: asset?.dynamicAttributes?.versionOs || 'N/A',
                    assetModel: asset?.dynamicAttributes?.modelo || asset?.dynamicAttributes?.Modelo || 'Generico',
                    assetMac: asset?.dynamicAttributes?.macAddress || 'N/A',
                    assetRam: asset?.dynamicAttributes?.ram || 'N/A',
                    assetProcessor: asset?.dynamicAttributes?.processor || 'N/A',
                    assetStorage: asset?.dynamicAttributes?.storage || 'N/A',
                    requiresPlacaIkusi: true
                });
            }
        }

        let realDept = 'Sistemas';
        if (collaborator && collaborator.department) {
            try {
                const dept = await departmentRepo.findById(Number(collaborator.department));
                if (dept) realDept = dept.name;
                else realDept = collaborator.department.toString();
            } catch (e) {
                realDept = collaborator.department.toString();
            }
        }
        const ceco = collaborator && collaborator.dynamicAttributes ? collaborator.dynamicAttributes['CECOS'] || collaborator.dynamicAttributes['cecos'] || collaborator.dynamicAttributes['CECO'] || 'N/A' : 'N/A';

        const documentPath = await documentService.generateAssignmentAct({
            actType: 'RETURN',
            returnMode: await resolveReturnMode(firstAssignment.collaboratorId, assignmentIds),
            assignmentId: `BATCH-${Date.now()}`,
            collaboratorName: collaborator?.name || 'N/A',
            collaboratorEmail: email,
            department: realDept,
            ceco: ceco,
            sede: collaborator?.location || 'N/A',
            assets: assetsDetails,
            ipAddress: 'PENDIENTE DE FIRMA',
            timestamp: new Date(),
            isForcedSignature: false,
            returnReason: reason || 'Fin de asignación'
        });

        const approveUrl = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/assignments/batch-accept-return?token=${token}`;

        const notification = await trySendNotification(() =>
            mailerService.sendReturnEmail(email, 'BATCH', token, documentPath, approveUrl)
        );

        res.json({
            message: notificationMessage(notification, email, 'Devolución múltiple iniciada y notificación de Webex enviada exitosamente.'),
            assignments,
            notificationSent: notification.sent,
            accountNotFound: notification.accountNotFound,
            notificationError: notification.error
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/batch-accept-return', async (req, res) => {
    try {
        const token = req.query.token as string;
        if (!token) return res.status(400).json({ error: 'Token is required' });

        const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown IP';
        const userAgent = req.headers['user-agent'] || 'Unknown User Agent';

        const assignments = await assignmentUseCases.confirmBatchReturn(token, ipAddress, userAgent);

        let documentPath = '';
        if (assignments.length > 0) {
            const firstAssignment = assignments[0];
            const collaborator = await collaboratorRepo.findById(firstAssignment.collaboratorId);
            
            let assetsDetails = [];
            for (const assign of assignments) {
                const asset = await catalogUseCases.getAssetById(assign.assetId);
                let category;
                if (asset) category = await catalogRepo.getCategoryById(asset.categoryId);
                
                assetsDetails.push({
                    assetId: assign.assetId,
                    assignmentDate: assign.startDate,
                    assetSerial: asset ? (asset.serial || 'N/A') : 'N/A',
                    assetType: category ? category.name : 'Laptop',
                    assetBrand: asset?.dynamicAttributes?.marca || asset?.dynamicAttributes?.Marca || 'Generico',
                    assetHostname: asset?.dynamicAttributes?.hostname || asset?.dynamicAttributes?.Hostname || 'N/A',
                    assetVersionOs: asset?.dynamicAttributes?.versionOs || 'N/A',
                    assetModel: asset?.dynamicAttributes?.modelo || asset?.dynamicAttributes?.Modelo || 'Generico',
                    assetMac: asset?.dynamicAttributes?.macAddress || 'N/A',
                    assetRam: asset?.dynamicAttributes?.ram || 'N/A',
                    assetProcessor: asset?.dynamicAttributes?.processor || 'N/A',
                    assetStorage: asset?.dynamicAttributes?.storage || 'N/A',
                    requiresPlacaIkusi: true
                });

                if (asset) {
                    // El activo queda bloqueado hasta que TI otorgue el Visto Bueno (approve-return)
                    await catalogUseCases.changeAssetStatus(asset.id, 'PENDING_INSPECTION');
                }
            }

            let realDept = 'Sistemas';
            if (collaborator && collaborator.department) {
                try {
                    const dept = await departmentRepo.findById(Number(collaborator.department));
                    if (dept) realDept = dept.name;
                    else realDept = collaborator.department.toString();
                } catch (e) {
                    realDept = collaborator.department.toString();
                }
            }
            const ceco = collaborator && collaborator.dynamicAttributes ? collaborator.dynamicAttributes['CECOS'] || collaborator.dynamicAttributes['cecos'] || collaborator.dynamicAttributes['CECO'] || 'N/A' : 'N/A';

            documentPath = await documentService.generateAssignmentAct({
                actType: 'RETURN',
                returnMode: await resolveReturnMode(firstAssignment.collaboratorId, assignments.map(a => a.id)),
                assignmentId: `BATCH-${Date.now()}`,
                collaboratorName: collaborator?.name || 'N/A',
                collaboratorEmail: collaborator?.email || 'N/A',
                department: realDept,
                ceco: ceco,
                sede: collaborator?.location || 'N/A',
                assets: assetsDetails,
                ipAddress,
                timestamp: new Date(),
                isForcedSignature: false
            });

            if (process.env.EMAIL_PROVIDER === 'webex' && collaborator?.email) {
                // Copia de cortesía: si Webex falla aquí no debe romper la confirmación de firma.
                await trySendNotification(() => mailerService.sendFinalPdfEmail(collaborator.email, documentPath));
            }
        }

        res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Devolución Múltiple Confirmada</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Inter', sans-serif; background-color: #f9fafb; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                    .card { background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.1); padding: 40px; text-align: center; max-width: 500px; width: 90%; }
                    .icon { background-color: #d1fae5; color: #10b981; width: 80px; height: 80px; border-radius: 50%; display: flex; justify-content: center; align-items: center; margin: 0 auto 24px; }
                    .icon svg { width: 40px; height: 40px; }
                    h1 { color: #111827; font-size: 24px; font-weight: 700; margin-bottom: 16px; }
                    p { color: #4b5563; font-size: 16px; line-height: 1.5; margin-bottom: 24px; }
                    .success-text { color: #10b981; font-weight: 600; }
                    .btn { display: inline-block; padding: 12px 24px; background-color: #00a650; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; transition: background-color 0.2s; }
                    .btn:hover { background-color: #008f45; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1>Devolución Completada</h1>
                    <p>Has confirmado exitosamente la devolución múltiple de los equipos.</p>
                    ${documentPath ? `<a href="${process.env.BACKEND_URL || 'http://localhost:3000'}${documentPath}" target="_blank" class="btn">Descargar Acta (PDF)</a>` : ''}
                </div>
            </body>
            </html>
        `);
    } catch (error: any) {
        res.status(400).send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Error en la Devolución</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Inter', sans-serif; background-color: #f9fafb; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                    .card { background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.1); padding: 40px; text-align: center; max-width: 500px; width: 90%; }
                    .icon { background-color: #fee2e2; color: #ef4444; width: 80px; height: 80px; border-radius: 50%; display: flex; justify-content: center; align-items: center; margin: 0 auto 24px; }
                    .icon svg { width: 40px; height: 40px; }
                    h1 { color: #111827; font-size: 24px; font-weight: 700; margin-bottom: 16px; }
                    p { color: #4b5563; font-size: 16px; line-height: 1.5; margin-bottom: 24px; }
                    .error-text { color: #ef4444; font-weight: 600; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h1>Ocurrió un error</h1>
                    <p class="error-text">${error.message || 'El enlace es inválido o ha expirado.'}</p>
                    <p>Por favor, contacta a soporte de TI para más información.</p>
                </div>
            </body>
            </html>
        `);
    }
});

export default router;
