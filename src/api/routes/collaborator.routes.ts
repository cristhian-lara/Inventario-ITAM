import { Router } from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { validateBody } from '../middlewares/validate.middleware';
import { PostgresCollaboratorRepository } from '../../modules/collaborator/infrastructure/PostgresCollaboratorRepository';
import { PostgresDepartmentRepository } from '../../modules/collaborator/infrastructure/PostgresDepartmentRepository';
import { PostgresCecosRepository } from '../../modules/collaborator/infrastructure/PostgresCecosRepository';
import { CollaboratorUseCases } from '../../modules/collaborator/application/CollaboratorUseCases';
import { CollaboratorHistory } from '../../modules/collaborator/domain/CollaboratorHistory';
import { PostgresAssignmentRepository } from '../../modules/assignment/infrastructure/PostgresAssignmentRepository';
import { AssignmentUseCases } from '../../modules/assignment/application/AssignmentUseCases';
import { WebexNotificationService } from '../../shared/infrastructure/services/WebexNotificationService';
import { PdfKitService } from '../../shared/infrastructure/services/PdfKitService';
import { CatalogUseCases } from '../../modules/catalog/application/CatalogUseCases';
import { PostgresCatalogRepository } from '../../modules/catalog/infrastructure/PostgresCatalogRepository';
import { AppDataSource } from '../../shared/infrastructure/database/postgres';
import { buildAssetActItem, resolveDepartmentName, extractCeco } from './helpers/assignmentActHelpers';

const departmentSchema = z.object({
    name: z.string().min(1, 'name es requerido'),
    description: z.string().optional(),
});

const cecosCreateSchema = z.object({
    id: z.string().min(1, 'id es requerido'),
    name: z.string().min(1, 'name es requerido'),
    description: z.string().optional(),
});

const cecosUpdateSchema = z.object({
    name: z.string().min(1, 'name es requerido'),
    description: z.string().optional(),
});

const offboardSchema = z.object({
    reason: z.string().trim().min(1, 'El motivo de la baja es obligatorio.'),
});

const updateCollaboratorSchema = z.object({
    name: z.string().min(1).optional(),
    departmentId: z.coerce.number().optional(),
    location: z.string().optional(),
    status: z.string().optional(),
    isLeader: z.boolean().optional(),
    leaderId: z.string().nullable().optional(),
    dynamicAttributes: z.record(z.string(), z.any()).optional(),
    activationDate: z.union([z.string(), z.date()]).optional(),
});

export const collaboratorRouter = Router();
const collaboratorRepository = new PostgresCollaboratorRepository();
const departmentRepository = new PostgresDepartmentRepository();
const cecosRepository = new PostgresCecosRepository();
const assignmentRepository = new PostgresAssignmentRepository();
const useCases = new CollaboratorUseCases(collaboratorRepository, departmentRepository, cecosRepository);
const assignmentUseCases = new AssignmentUseCases(assignmentRepository, new WebexNotificationService());
const documentService = new PdfKitService();
const catalogRepo = new PostgresCatalogRepository();
const catalogUseCases = new CatalogUseCases(catalogRepo);

// --- Departments Routes ---

collaboratorRouter.get('/departments', async (req, res) => {
    try {
        const departments = await useCases.getAllDepartments();
        res.json(departments);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

collaboratorRouter.post('/departments', validateBody(departmentSchema), async (req, res) => {
    try {
        const { name, description } = req.body;
        const departmentObj = await useCases.createDepartment({ name, description });
        res.status(201).json(departmentObj);
    } catch (error: any) {
        if (error.message.includes('already exists')) {
            return res.status(409).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

collaboratorRouter.put('/departments/:id', validateBody(departmentSchema), async (req, res) => {
    try {
        const { name, description } = req.body;
        const departmentObj = await useCases.updateDepartment(Number(req.params.id), name, description);
        res.json(departmentObj);
    } catch (error: any) {
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

// --- CECOS ROUTES ---
collaboratorRouter.get('/cecos', async (req, res) => {
    try {
        const cecos = await useCases.getAllCecos();
        res.json(cecos);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

collaboratorRouter.post('/cecos', validateBody(cecosCreateSchema), async (req, res) => {
    try {
        const { id, name, description } = req.body;
        const cecos = await useCases.createCecos(id, name, description || '');
        res.status(201).json(cecos);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

collaboratorRouter.put('/cecos/:id', validateBody(cecosUpdateSchema), async (req, res) => {
    try {
        const { name, description } = req.body;
        const cecos = await useCases.updateCecos(req.params.id, name, description || '');
        res.json(cecos);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});


// --- Collaborators Routes ---

const withAssignedCount = (collaborators: any[], allAssignments: any[]) =>
    collaborators.map(c => ({
        ...c,
        assignedAssetsCount: allAssignments.filter(a => a.collaboratorId === c.id && (a.status === 'ACCEPTED' || a.status === 'PENDING_ACCEPTANCE')).length
    }));

// Paginación opcional vía ?page=&limit= (compatible hacia atrás: sin esos
// parámetros devuelve el arreglo completo, igual que antes).
collaboratorRouter.get('/', async (req, res) => {
    try {
        const allAssignments = await assignmentRepository.findAllActive();

        if (req.query.page || req.query.limit) {
            const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
            const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
            const { items, total } = await useCases.getCollaboratorsPaginated(page, limit);
            return res.json({ data: withAssignedCount(items, allAssignments), total, page, limit });
        }

        const collaborators = await useCases.getAllCollaborators();
        res.json(withAssignedCount(collaborators, allAssignments));
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

collaboratorRouter.get('/:id', async (req, res) => {
    try {
        const collaborator = await useCases.getCollaboratorById(req.params.id);
        if (!collaborator) return res.status(404).json({ error: 'Collaborator not found' });
        
        const allAssignments = await assignmentRepository.findAllActive();
        const assignedAssetsCount = allAssignments.filter(a => a.collaboratorId === collaborator.id && (a.status === 'ACCEPTED' || a.status === 'PENDING_ACCEPTANCE')).length;
        
        res.json({
            ...collaborator,
            assignedAssetsCount
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

collaboratorRouter.get('/:id/history', async (req, res) => {
    try {
        const history = await useCases.getCollaboratorHistory(req.params.id);
        res.json(history);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

const upload = multer({ storage: multer.memoryStorage() });

collaboratorRouter.post('/import', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }

        const isCsv = req.file.originalname.toLowerCase().endsWith('.csv');
        let workbook;
        if (isCsv) {
            const csvString = req.file.buffer.toString('utf8');
            workbook = xlsx.read(csvString, { type: 'string', cellDates: true });
        } else {
            workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
        }
        
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const records = xlsx.utils.sheet_to_json(sheet);

        const result = await useCases.importCollaborators(records);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

const createCollaboratorSchema = z.object({
    name: z.string().min(1, 'name es requerido'),
    email: z.string().email('email inválido'),
    department: z.coerce.number({ message: 'department debe ser numérico' }),
    location: z.string().min(1, 'location es requerido'),
    isLeader: z.boolean().optional(),
    leaderId: z.string().nullable().optional(),
    dynamicAttributes: z.record(z.string(), z.any()).optional(),
    activationDate: z.union([z.string(), z.date()]).optional(),
});

collaboratorRouter.post('/', validateBody(createCollaboratorSchema), async (req, res) => {
    try {
        const { name, email, department, location, isLeader, leaderId, dynamicAttributes, activationDate } = req.body;

        const collaborator = await useCases.createCollaborator({
            name, email, department: Number(department), location, isLeader, leaderId, dynamicAttributes, activationDate 
        });
        res.status(201).json(collaborator);
    } catch (error: any) {
        if (error.message.includes('already exists')) {
            return res.status(409).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

collaboratorRouter.patch('/:id/toggle-status', async (req, res) => {
    try {
        const updated = await useCases.toggleCollaboratorStatus(req.params.id);
        res.json(updated);
    } catch (error: any) {
        if (error.message === 'Collaborator not found') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * Baja de colaborador con devolución forzada de TODOS sus activos asignados
 * y generación de un único acta de Paz y Salvo. Operación administrativa
 * inmediata (sin esperar firma del colaborador): pensada para offboarding.
 */
collaboratorRouter.post('/:id/offboard', validateBody(offboardSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const reason = req.body.reason.trim();

        const collaborator = await useCases.getCollaboratorById(id);
        if (!collaborator) return res.status(404).json({ error: 'Colaborador no encontrado' });
        if (collaborator.status !== 'ACTIVE') {
            return res.status(400).json({ error: 'El colaborador ya se encuentra inactivo.' });
        }

        const allActive = await assignmentRepository.findAllActive();
        const toReturn = allActive.filter(a => a.collaboratorId === id && (a.status === 'ACCEPTED' || a.status === 'PENDING_ACCEPTANCE'));

        // Toda la operación (devoluciones + cambio de estado de activos + acta +
        // baja del colaborador) corre en una única transacción: si falla cualquier
        // paso (incluida la generación del PDF), no debe quedar ningún activo
        // marcado como devuelto ni el colaborador dado de baja a medias.
        const result = await AppDataSource.manager.transaction(async (manager) => {
            const txAssignmentRepo = new PostgresAssignmentRepository(manager);
            const txAssignmentUseCases = new AssignmentUseCases(txAssignmentRepo, new WebexNotificationService());
            const txCatalogRepo = new PostgresCatalogRepository(manager);
            const txCatalogUseCases = new CatalogUseCases(txCatalogRepo);
            const txCollaboratorRepo = new PostgresCollaboratorRepository(manager);
            const txCollaboratorUseCases = new CollaboratorUseCases(txCollaboratorRepo, departmentRepository, cecosRepository);

            let documentPath: string | undefined;

            if (toReturn.length > 0) {
                const ipAddress = `Baja de colaborador (Paz y Salvo).\nMotivo: ${reason}`;
                const returnedAssignments = [];
                for (const a of toReturn) {
                    const returned = await txAssignmentUseCases.forceReturn(a.id, ipAddress);
                    // El activo queda bloqueado hasta que TI otorgue el Visto Bueno (approve-return)
                    await txCatalogUseCases.changeAssetStatus(returned.assetId, 'PENDING_INSPECTION');
                    returnedAssignments.push(returned);
                }

                const assetsDetails = [];
                for (const assign of returnedAssignments) {
                    const asset = await txCatalogUseCases.getAssetById(assign.assetId);
                    const category = asset ? await txCatalogRepo.getCategoryById(asset.categoryId) : null;
                    assetsDetails.push(buildAssetActItem(asset, category, assign));
                }

                const realDept = await resolveDepartmentName(collaborator.department, departmentRepository);
                const ceco = extractCeco(collaborator.dynamicAttributes);

                // Generación del PDF dentro de la transacción a propósito: si falla,
                // el rollback deshace las devoluciones y los cambios de estado de activos.
                documentPath = await documentService.generateAssignmentAct({
                    actType: 'RETURN',
                    returnMode: 'PAZ_Y_SALVO',
                    assignmentId: `OFFBOARD-${id}-${Date.now()}`,
                    collaboratorName: collaborator.name,
                    collaboratorEmail: collaborator.email,
                    department: realDept,
                    ceco,
                    sede: collaborator.location,
                    assets: assetsDetails,
                    ipAddress,
                    timestamp: new Date(),
                    isForcedSignature: true,
                    returnReason: reason
                });

                for (const assign of returnedAssignments) {
                    await txAssignmentUseCases.updateDocumentPath(assign.id, documentPath);
                }

                await txCollaboratorRepo.saveHistory(new CollaboratorHistory(
                    uuidv4(),
                    id,
                    'ASSET_RETURNED',
                    new Date(),
                    `Paz y Salvo: ${toReturn.length} activo(s) devuelto(s) por baja del colaborador. Motivo: ${reason}`
                ));
            }

            const updatedCollaborator = await txCollaboratorUseCases.toggleCollaboratorStatus(id);

            return { updatedCollaborator, documentPath };
        });

        res.json({
            message: toReturn.length > 0
                ? `Colaborador dado de baja. Se generó el Paz y Salvo de ${toReturn.length} activo(s).`
                : 'Colaborador dado de baja.',
            collaborator: result.updatedCollaborator,
            documentPath: result.documentPath,
            returnedCount: toReturn.length
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});


// --- UPDATE COLLABORATOR ---
collaboratorRouter.put('/:id', validateBody(updateCollaboratorSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, departmentId, location, status, isLeader, leaderId, dynamicAttributes, activationDate } = req.body;
        const collaborator = await useCases.updateCollaborator(
            id,
            name,
            departmentId,
            location,
            status,
            isLeader,
            leaderId,
            dynamicAttributes,
            activationDate
        );
        res.json(collaborator);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});
