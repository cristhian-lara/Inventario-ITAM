import { Router } from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { PostgresCollaboratorRepository } from '../../modules/collaborator/infrastructure/PostgresCollaboratorRepository';
import { PostgresDepartmentRepository } from '../../modules/collaborator/infrastructure/PostgresDepartmentRepository';
import { PostgresCecosRepository } from '../../modules/collaborator/infrastructure/PostgresCecosRepository';
import { CollaboratorUseCases } from '../../modules/collaborator/application/CollaboratorUseCases';

export const collaboratorRouter = Router();
const collaboratorRepository = new PostgresCollaboratorRepository();
const departmentRepository = new PostgresDepartmentRepository();
const cecosRepository = new PostgresCecosRepository();
const useCases = new CollaboratorUseCases(collaboratorRepository, departmentRepository, cecosRepository);

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
        res.json(collaborators);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

collaboratorRouter.get('/:id', async (req, res) => {
    try {
        const collaborator = await useCases.getCollaboratorById(req.params.id);
        if (!collaborator) return res.status(404).json({ error: 'Collaborator not found' });
        res.json(collaborator);
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

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
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
