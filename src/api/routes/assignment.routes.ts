import { Router } from 'express';
import { AssignmentUseCases } from '../../modules/assignment/application/AssignmentUseCases';
import { PostgresAssignmentRepository } from '../../modules/assignment/infrastructure/PostgresAssignmentRepository';
import { NodemailerService } from '../../shared/infrastructure/services/NodemailerService';
import { PdfKitService } from '../../shared/infrastructure/services/PdfKitService';
import express from 'express';
import { CatalogUseCases } from '../../modules/catalog/application/CatalogUseCases';
import { PostgresCatalogRepository } from '../../modules/catalog/infrastructure/PostgresCatalogRepository';
import { PostgresCollaboratorRepository } from '../../modules/collaborator/infrastructure/PostgresCollaboratorRepository';
import { CollaboratorHistory } from '../../modules/collaborator/domain/CollaboratorHistory';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const assignmentRepo = new PostgresAssignmentRepository();
const mailerService = new NodemailerService();
const documentService = new PdfKitService();
const assignmentUseCases = new AssignmentUseCases(assignmentRepo, mailerService);

const catalogRepo = new PostgresCatalogRepository();
const catalogUseCases = new CatalogUseCases(catalogRepo);

const collaboratorRepo = new PostgresCollaboratorRepository();

// 1. Iniciar Asignación
router.post('/', async (req, res) => {
    try {
        const { id, assetId, collaboratorId, collaboratorEmail } = req.body;
        
        // Validación de Dominio: El activo debe existir y estar DISPONIBLE
        const asset = await catalogUseCases.getAssetById(assetId);
        if (!asset) {
            return res.status(404).json({ error: `El activo ${assetId} no existe en el catálogo.` });
        }
        if (asset.status !== 'AVAILABLE') {
            return res.status(400).json({ error: `El activo ${assetId} no se puede asignar porque su estado actual es: ${asset.status}` });
        }

        const assignment = await assignmentUseCases.createAssignment(id, assetId, collaboratorId, collaboratorEmail);
        
        res.status(201).json({
            message: 'Asignación iniciada y correo enviado exitosamente.',
            assignmentId: assignment.id,
            status: assignment.status
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Listar todas las asignaciones activas
router.get('/', async (req, res) => {
    try {
        const assignments = await assignmentUseCases.getAllActiveAssignments();
        res.json(assignments.map(a => ({
            id: a.id,
            assetId: a.assetId,
            collaboratorId: a.collaboratorId,
            status: a.status,
            startDate: a.startDate,
            endDate: a.endDate,
            documentPath: (a as any).props.documentPath
        })));
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Iniciar devolución
router.post('/:id/return', async (req, res) => {
    try {
        const { email } = req.body;
        const assignment = await assignmentUseCases.initiateReturn(req.params.id, email || 'test@ikusi.com');
        res.json(assignment);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Iniciar devolución por Asset ID
router.post('/return-by-asset/:assetId', async (req, res) => {
    try {
        const { email } = req.body;
        const assignment = await assignmentUseCases.initiateReturnByAsset(req.params.assetId, email || 'test@ikusi.com');
        res.json(assignment);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Reenviar Link de Firma
router.post('/:id/resend-link', async (req, res) => {
    try {
        const { email } = req.body;
        await assignmentUseCases.resendLink(req.params.id, email);
        res.json({ message: 'Enlace reenviado exitosamente' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/resend-link-by-asset/:assetId', async (req, res) => {
    try {
        const { email } = req.body;
        const assignment = await assignmentRepo.findActiveByAssetId(req.params.assetId);
        if (!assignment) throw new Error('No se encontró asignación activa');
        await assignmentUseCases.resendLink(assignment.id, email || 'test@ikusi.com');
        res.json({ message: 'Enlace reenviado exitosamente' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Devolución Forzada (Administrativa)
router.post('/:id/force-return', async (req, res) => {
    try {
        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
        const returnedAssignment = await assignmentUseCases.forceReturn(req.params.id, ipAddress);
        
        // Actualizar el estado del activo en el Catálogo a AVAILABLE
        await catalogUseCases.changeAssetStatus(returnedAssignment.assetId, 'AVAILABLE');

        // Generar PDF de Paz y Salvo Administrativo
                const asset = await catalogUseCases.getAssetById(returnedAssignment.assetId);
        const category = asset ? await catalogRepo.getCategoryById(asset.categoryId) : null;
        const requiresPlaca = category ? category.schemaDefinition.requiresPlacaIkusi !== false : true;
        const documentPath = await documentService.generateAssignmentAct({
            actType: 'RETURN',
            assignmentId: returnedAssignment.id,
            collaboratorName: 'ADMINISTRADOR TI (Devolución Forzada)',
            collaboratorEmail: 'admin@ikusi.com',
            department: 'Sistemas',
            assetId: returnedAssignment.assetId,
            assetSerial: asset ? (asset.serial || 'N/A') : 'N/A',
            assetType: 'Laptop',
            assetModel: asset && asset.dynamicAttributes ? asset.dynamicAttributes.modelo || 'Generico' : 'Generico',
            assetMac: asset && asset.dynamicAttributes ? asset.dynamicAttributes.macAddress || 'N/A' : 'N/A',
            assetRam: asset && asset.dynamicAttributes ? asset.dynamicAttributes.ram || 'N/A' : 'N/A',
            assetProcessor: asset && asset.dynamicAttributes ? asset.dynamicAttributes.processor || 'N/A' : 'N/A',
            assetStorage: asset && asset.dynamicAttributes ? asset.dynamicAttributes.storage || 'N/A' : 'N/A',
            requiresPlacaIkusi: requiresPlaca,
            ipAddress,
            timestamp: new Date()
        });

        await assignmentUseCases.updateDocumentPath(returnedAssignment.id, documentPath);
        
        await collaboratorRepo.saveHistory(new CollaboratorHistory(
            uuidv4(),
            returnedAssignment.collaboratorId,
            'ASSET_RETURNED' as any,
            new Date(),
            `Activo ${returnedAssignment.assetId} devuelto forzadamente`
        ));

        res.json({ message: 'Devolución forzada exitosa', documentPath });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/force-return-by-asset/:assetId', async (req, res) => {
    try {
        const assignment = await assignmentRepo.findActiveByAssetId(req.params.assetId);
        if (!assignment) throw new Error('No se encontró asignación activa');
        
        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
        const returnedAssignment = await assignmentUseCases.forceReturn(assignment.id, ipAddress);
        
        await catalogUseCases.changeAssetStatus(returnedAssignment.assetId, 'AVAILABLE');

                const asset = await catalogUseCases.getAssetById(returnedAssignment.assetId);
        const category = asset ? await catalogRepo.getCategoryById(asset.categoryId) : null;
        const requiresPlaca = category ? category.schemaDefinition.requiresPlacaIkusi !== false : true;
        const documentPath = await documentService.generateAssignmentAct({
            actType: 'RETURN',
            assignmentId: returnedAssignment.id,
            collaboratorName: 'ADMINISTRADOR TI (Devolución Forzada)',
            collaboratorEmail: 'admin@ikusi.com',
            department: 'Sistemas',
            assetId: returnedAssignment.assetId,
            assetSerial: asset ? (asset.serial || 'N/A') : 'N/A',
            assetType: 'Laptop',
            assetModel: asset && asset.dynamicAttributes ? asset.dynamicAttributes.modelo || 'Generico' : 'Generico',
            assetMac: asset && asset.dynamicAttributes ? asset.dynamicAttributes.macAddress || 'N/A' : 'N/A',
            assetRam: asset && asset.dynamicAttributes ? asset.dynamicAttributes.ram || 'N/A' : 'N/A',
            assetProcessor: asset && asset.dynamicAttributes ? asset.dynamicAttributes.processor || 'N/A' : 'N/A',
            assetStorage: asset && asset.dynamicAttributes ? asset.dynamicAttributes.storage || 'N/A' : 'N/A',
            requiresPlacaIkusi: requiresPlaca,
            ipAddress,
            timestamp: new Date()
        });

        await assignmentUseCases.updateDocumentPath(returnedAssignment.id, documentPath);
        
        await collaboratorRepo.saveHistory(new CollaboratorHistory(
            uuidv4(),
            returnedAssignment.collaboratorId,
            'ASSET_RETURNED' as any,
            new Date(),
            `Activo ${returnedAssignment.assetId} devuelto forzadamente`
        ));

        res.json({ message: 'Devolución forzada exitosa', documentPath });
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
        
        // Actualizar el estado del activo en el Catálogo a AVAILABLE
        await catalogUseCases.changeAssetStatus(returnedAssignment.assetId, 'AVAILABLE');

        // Buscar activo para poblar el PDF
                const asset = await catalogUseCases.getAssetById(returnedAssignment.assetId);
        const category = asset ? await catalogRepo.getCategoryById(asset.categoryId) : null;
        const requiresPlaca = category ? category.schemaDefinition.requiresPlacaIkusi !== false : true;
        
        // Generar PDF de Paz y Salvo
        const documentPath = await documentService.generateAssignmentAct({
            actType: 'RETURN',
            assignmentId: returnedAssignment.id,
            collaboratorName: returnedAssignment.collaboratorId,
            collaboratorEmail: 'test@ikusi.com',
            department: 'Sistemas',
            assetId: returnedAssignment.assetId,
            assetSerial: asset ? (asset.serial || 'N/A') : 'N/A',
            assetType: 'Laptop',
            assetModel: asset && asset.dynamicAttributes ? asset.dynamicAttributes.modelo || 'Generico' : 'Generico',
            assetMac: asset && asset.dynamicAttributes ? asset.dynamicAttributes.macAddress || 'N/A' : 'N/A',
            assetRam: asset && asset.dynamicAttributes ? asset.dynamicAttributes.ram || 'N/A' : 'N/A',
            assetProcessor: asset && asset.dynamicAttributes ? asset.dynamicAttributes.processor || 'N/A' : 'N/A',
            assetStorage: asset && asset.dynamicAttributes ? asset.dynamicAttributes.storage || 'N/A' : 'N/A',
            requiresPlacaIkusi: requiresPlaca,
            ipAddress,
            timestamp: new Date()
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
            <div style="text-align:center; padding: 50px; font-family: sans-serif;">
                <h1 style="color:#e0a800;">¡Paz y Salvo Generado!</h1>
                <p>El equipo ha sido devuelto satisfactoriamente. Tu firma digital ha sido registrada con la IP <b>${ipAddress}</b>.</p>
                <p>El activo vuelve a estar disponible en el inventario general.</p>
                <a href="http://localhost:3000${documentPath}" target="_blank" style="display:inline-block; margin-top:20px; padding:10px 20px; background:#e0a800; color:white; text-decoration:none; border-radius:5px;">Ver Acta de Paz y Salvo (PDF)</a>
            </div>
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
        const documentPath = await documentService.generateAssignmentAct({
            actType: 'ASSIGNMENT',
            assignmentId: acceptedAssignment.id,
            collaboratorName: acceptedAssignment.collaboratorId, // idealmente buscaríamos en DB de empleados
            collaboratorEmail: 'test@ikusi.com',
            department: 'Sistemas',
            assetId: acceptedAssignment.assetId,
            assetSerial: asset ? (asset.serial || 'N/A') : 'N/A',
            assetType: 'Laptop',
            assetModel: asset && asset.dynamicAttributes ? asset.dynamicAttributes.modelo || 'Generico' : 'Generico',
            assetMac: asset && asset.dynamicAttributes ? asset.dynamicAttributes.macAddress || 'N/A' : 'N/A',
            assetRam: asset && asset.dynamicAttributes ? asset.dynamicAttributes.ram || 'N/A' : 'N/A',
            assetProcessor: asset && asset.dynamicAttributes ? asset.dynamicAttributes.processor || 'N/A' : 'N/A',
            assetStorage: asset && asset.dynamicAttributes ? asset.dynamicAttributes.storage || 'N/A' : 'N/A',
            requiresPlacaIkusi: requiresPlaca,
            ipAddress,
            timestamp: new Date()
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
            <div style="text-align:center; padding: 50px; font-family: sans-serif;">
                <h1 style="color: green;">✅ Asignación Aceptada</h1>
                <p>El activo ha sido asignado a tu nombre. Tu firma digital ha sido registrada exitosamente con la IP <b>${ipAddress}</b>.</p>
                <p>Se ha generado el Acta Física (PDF) inmutable.</p>
                <a href="http://localhost:3000${documentPath}" target="_blank" style="display:inline-block; margin-top:20px; padding:10px 20px; background:#00a650; color:white; text-decoration:none; border-radius:5px;">Ver Acta Firmada (PDF)</a>
            </div>
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

export default router;
