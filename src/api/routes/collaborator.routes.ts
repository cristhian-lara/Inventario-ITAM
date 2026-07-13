import { Router } from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
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

collaboratorRouter.post('/departments', async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Missing required fields (name)' });
        }
        const departmentObj = await useCases.createDepartment({ name, description });
        res.status(201).json(departmentObj);
    } catch (error: any) {
        if (error.message.includes('already exists')) {
            return res.status(409).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

collaboratorRouter.put('/departments/:id', async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Missing required fields (name)' });
        }
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

collaboratorRouter.post('/cecos', async (req, res) => {
    try {
        const { id, name, description } = req.body;
        const cecos = await useCases.createCecos(id, name, description || '');
        res.status(201).json(cecos);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

collaboratorRouter.put('/cecos/:id', async (req, res) => {
    try {
        const { name, description } = req.body;
        const cecos = await useCases.updateCecos(req.params.id, name, description || '');
        res.json(cecos);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});


// --- Collaborators Routes ---

collaboratorRouter.get('/', async (req, res) => {
    try {
        const collaborators = await useCases.getAllCollaborators();
        const allAssignments = await assignmentRepository.findAllActive();
        
        const response = collaborators.map(c => {
            const assignedAssetsCount = allAssignments.filter(a => a.collaboratorId === c.id && (a.status === 'ACCEPTED' || a.status === 'PENDING_ACCEPTANCE')).length;
            return {
                ...c,
                assignedAssetsCount
            };
        });
        
        res.json(response);
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

collaboratorRouter.post('/', async (req, res) => {
    try {
        const { name, email, department, location, isLeader, leaderId, dynamicAttributes, activationDate } = req.body;
        if (!name || !email || !department || !location) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

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
collaboratorRouter.post('/:id/offboard', async (req, res) => {
    try {
        const { id } = req.params;
        const reason = (req.body?.reason || 'Baja de colaborador').toString().trim();

        const collaborator = await useCases.getCollaboratorById(id);
        if (!collaborator) return res.status(404).json({ error: 'Colaborador no encontrado' });
        if (collaborator.status !== 'ACTIVE') {
            return res.status(400).json({ error: 'El colaborador ya se encuentra inactivo.' });
        }

        const allActive = await assignmentRepository.findAllActive();
        const toReturn = allActive.filter(a => a.collaboratorId === id && (a.status === 'ACCEPTED' || a.status === 'PENDING_ACCEPTANCE'));

        let documentPath: string | undefined;

        if (toReturn.length > 0) {
            const ipAddress = `Baja de colaborador (Paz y Salvo).\nMotivo: ${reason}`;
            const returnedAssignments = [];
            for (const a of toReturn) {
                const returned = await assignmentUseCases.forceReturn(a.id, ipAddress);
                // El activo queda bloqueado hasta que TI otorgue el Visto Bueno (approve-return)
                await catalogUseCases.changeAssetStatus(returned.assetId, 'PENDING_INSPECTION');
                returnedAssignments.push(returned);
            }

            const assetsDetails = [];
            for (const assign of returnedAssignments) {
                const asset = await catalogUseCases.getAssetById(assign.assetId);
                const category = asset ? await catalogRepo.getCategoryById(asset.categoryId) : null;
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

            let realDept = 'Sistemas';
            if (collaborator.department) {
                try {
                    const dept = await departmentRepository.findById(Number(collaborator.department));
                    realDept = dept ? dept.name : collaborator.department.toString();
                } catch (e) {
                    realDept = collaborator.department.toString();
                }
            }
            const ceco = collaborator.dynamicAttributes?.CECOS || collaborator.dynamicAttributes?.cecos || collaborator.dynamicAttributes?.CECO || 'N/A';

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
                await assignmentUseCases.updateDocumentPath(assign.id, documentPath);
            }

            await collaboratorRepository.saveHistory(new CollaboratorHistory(
                uuidv4(),
                id,
                'ASSET_RETURNED',
                new Date(),
                `Paz y Salvo: ${toReturn.length} activo(s) devuelto(s) por baja del colaborador. Motivo: ${reason}`
            ));
        }

        const updatedCollaborator = await useCases.toggleCollaboratorStatus(id);

        res.json({
            message: toReturn.length > 0
                ? `Colaborador dado de baja. Se generó el Paz y Salvo de ${toReturn.length} activo(s).`
                : 'Colaborador dado de baja.',
            collaborator: updatedCollaborator,
            documentPath,
            returnedCount: toReturn.length
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});


// --- UPDATE COLLABORATOR ---
collaboratorRouter.put('/:id', async (req, res) => {
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
