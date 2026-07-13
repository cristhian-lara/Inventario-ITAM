import { AppDataSource } from '../shared/infrastructure/database/postgres';
import { CollaboratorUseCases } from '../modules/collaborator/application/CollaboratorUseCases';
import { PostgresCollaboratorRepository } from '../modules/collaborator/infrastructure/PostgresCollaboratorRepository';
import { PostgresDepartmentRepository } from '../modules/collaborator/infrastructure/PostgresDepartmentRepository';
import { PostgresCecosRepository } from '../modules/collaborator/infrastructure/PostgresCecosRepository';
import { Department } from '../modules/collaborator/domain/Department';
import { PostgresCatalogRepository } from '../modules/catalog/infrastructure/PostgresCatalogRepository';
import { CatalogUseCases } from '../modules/catalog/application/CatalogUseCases';
import { Category } from '../modules/catalog/domain/Category';
import { PostgresAssignmentRepository } from '../modules/assignment/infrastructure/PostgresAssignmentRepository';
import { AssignmentUseCases } from '../modules/assignment/application/AssignmentUseCases';
import { IMailerService } from '../shared/contracts/IMailerService';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
    console.log('🌱 Iniciando Seed de Datos...');

    await AppDataSource.initialize();
    console.log('✅ Base de datos conectada.');

    const collabRepo = new PostgresCollaboratorRepository();
    const departmentRepo = new PostgresDepartmentRepository();
    const cecosRepo = new PostgresCecosRepository();
    const collabUseCases = new CollaboratorUseCases(collabRepo, departmentRepo, cecosRepo);

    const catalogRepo = new PostgresCatalogRepository();
    const catalogUseCases = new CatalogUseCases(catalogRepo);

    const assignRepo = new PostgresAssignmentRepository();
    // Mailer de mentira: el seed no envía correos reales
    const mockMailer: IMailerService = {
        sendAssignmentEmail: async () => {},
        sendReturnEmail: async () => {},
        sendMaintenanceSignatureEmail: async () => {},
        sendFinalPdfEmail: async () => {}
    };
    const assignUseCases = new AssignmentUseCases(assignRepo, mockMailer);

    // 1. Crear Departamentos base si no existen
    console.log('🏢 Generando Departamentos...');
    const departmentNames = ['IT', 'Ventas', 'Marketing', 'Finanzas', 'Recursos Humanos', 'Operaciones'];
    let departments = await departmentRepo.findAll();
    for (const name of departmentNames) {
        if (!departments.some(d => d.name.toLowerCase() === name.toLowerCase())) {
            await departmentRepo.save(Department.create(name));
            console.log(`Departamento creado: ${name}`);
        }
    }
    departments = await departmentRepo.findAll();

    // 2. Crear Categorías base si no existen (esquema con campos tipados)
    const categoriesData = [
        {
            name: 'Laptop',
            schema: {
                requiresPlacaIkusi: true,
                fields: [
                    { name: 'macAddress', type: 'text', isRequired: true },
                    { name: 'processor', type: 'text', isRequired: true },
                    { name: 'ram', type: 'text', isRequired: true },
                    { name: 'warrantyEnd', type: 'text', isRequired: false }
                ]
            }
        },
        {
            name: 'Teléfono Móvil',
            schema: {
                requiresPlacaIkusi: true,
                fields: [
                    { name: 'imei', type: 'text', isRequired: true },
                    { name: 'model', type: 'text', isRequired: true },
                    { name: 'warrantyEnd', type: 'text', isRequired: false }
                ]
            }
        },
        {
            name: 'Monitor',
            schema: {
                requiresPlacaIkusi: true,
                fields: [
                    { name: 'resolution', type: 'text', isRequired: true },
                    { name: 'size', type: 'text', isRequired: true }
                ]
            }
        }
    ];

    const existingCategories = await catalogUseCases.getAllCategories();
    const categories: Category[] = [];
    for (const c of categoriesData) {
        const exists = existingCategories.find(cat => cat.name.toLowerCase() === c.name.toLowerCase());
        if (exists) {
            categories.push(exists);
        } else {
            await catalogUseCases.createCategory(c.name, c.schema);
            console.log(`Categoría creada: ${c.name}`);
        }
    }
    // Releer para obtener los ids autogenerados
    const allCategories = await catalogUseCases.getAllCategories();
    categories.length = 0;
    for (const c of categoriesData) {
        const found = allCategories.find(cat => cat.name.toLowerCase() === c.name.toLowerCase());
        if (found) categories.push(found);
    }

    // 3. Generar 15 Colaboradores (algunos inactivos)
    console.log('👤 Generando Colaboradores...');
    const locations = ['CDMX HQ', 'Monterrey', 'Guadalajara', 'Remoto'];

    const collaborators = [];
    for (let i = 1; i <= 15; i++) {
        try {
            const department = departments[Math.floor(Math.random() * departments.length)];
            const collab = await collabUseCases.createCollaborator({
                name: `Colaborador Demo ${i}`,
                email: `demo${i}@ikusi.com`,
                department: department.id as number,
                location: locations[Math.floor(Math.random() * locations.length)]
            });
            collaborators.push(collab);

            // Desactivar algunos
            if (i % 5 === 0) {
                await collabUseCases.toggleCollaboratorStatus(collab.id);
            }
        } catch (error: any) {
            console.log(`Saltando colaborador demo${i}: ${error.message}`);
        }
    }

    // 4. Generar 30 Activos
    console.log('💻 Generando Activos...');
    const assets = [];
    for (let i = 1; i <= 30; i++) {
        const category = categories[i % categories.length];
        const dynamicAttrs: any = {};

        if (category.name === 'Laptop') {
            dynamicAttrs.macAddress = `00:1B:44:11:3A:${Math.floor(Math.random() * 99).toString().padStart(2, '0')}`;
            dynamicAttrs.processor = i % 2 === 0 ? 'Intel Core i7' : 'AMD Ryzen 7';
            dynamicAttrs.ram = '16GB';
            dynamicAttrs.warrantyEnd = new Date(Date.now() + Math.random() * 31536000000).toISOString().split('T')[0]; // Fecha en el prox año
        } else if (category.name === 'Teléfono Móvil') {
            dynamicAttrs.imei = `3589410${Math.floor(Math.random() * 10000000)}`;
            dynamicAttrs.model = i % 2 === 0 ? 'iPhone 13' : 'Samsung Galaxy S22';
            dynamicAttrs.warrantyEnd = new Date(Date.now() + (Math.random() * 60 - 15) * 86400000).toISOString().split('T')[0]; // Algunas por vencer
        } else {
            dynamicAttrs.resolution = '1920x1080';
            dynamicAttrs.size = '24 pulgadas';
        }

        try {
            const assetId = `AST-2026-${i.toString().padStart(3, '0')}`;
            // Evita re-crear (y resetear el estado de) activos ya sembrados
            if (await catalogUseCases.getAssetById(assetId)) continue;

            const asset = await catalogUseCases.createAsset(
                assetId,
                category.id as number,
                `SN-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
                dynamicAttrs
            );

            // Cambiar estados para simular histórico; los retirados/en mantenimiento
            // quedan fuera del pool de asignación
            if (i % 8 === 0) {
                // Activo retirado (dado de baja)
                await catalogUseCases.changeAssetStatus(asset.id, 'RETIRED', 'Seed: baja de demostración');
            } else if (i % 7 === 0) {
                // Mantenimiento
                await catalogUseCases.changeAssetStatus(asset.id, 'IN_MAINTENANCE');
            } else {
                assets.push(asset);
            }
        } catch (error: any) {
            console.log(`Saltando activo AST-2026-${i.toString().padStart(3, '0')}: ${error.message}`);
        }
    }

    // 5. Generar Asignaciones e Histórico
    console.log('🔄 Generando Asignaciones e Historial...');
    const availableAssets = [...assets];

    for (let i = 0; i < 20 && collaborators.length > 0; i++) {
        const asset = availableAssets.pop();
        if (!asset) break;

        const collab = collaborators[Math.floor(Math.random() * collaborators.length)];

        try {
            // Asignar
            const assignmentId = `assig-${uuidv4().substring(0, 8)}`;
            const { token } = await assignUseCases.createAssignment(assignmentId, asset.id, collab.id, collab.email);

            // Aceptar la asignación (firmar virtualmente) — igual que en las rutas,
            // la aceptación deja el activo IN_USE
            await assignUseCases.acceptAssignment(assignmentId, token, '127.0.0.1', 'Seed Script');
            await catalogUseCases.changeAssetStatus(asset.id, 'IN_USE');

            // Algunas asignaciones ya fueron devueltas en el pasado.
            // La devolución bloquea el activo (PENDING_INSPECTION) hasta el Visto Bueno.
            if (i % 3 === 0) {
                const { token: returnToken } = await assignUseCases.initiateReturn(assignmentId, collab.email);
                await assignUseCases.confirmReturn(assignmentId, returnToken, '127.0.0.1', 'Seed Script');
                await catalogUseCases.changeAssetStatus(asset.id, 'PENDING_INSPECTION');

                // A la mitad de las devueltas se les otorga el Visto Bueno (activo liberado)
                if (i % 6 === 0) {
                    await assignUseCases.approveReturn(assignmentId, 'Seed Script', 'Visto Bueno de demostración');
                    await catalogUseCases.changeAssetStatus(asset.id, 'AVAILABLE');
                }
            } else if (i % 5 === 0) {
                // Forzar devolución (también queda pendiente de inspección)
                await assignUseCases.forceReturn(assignmentId, '127.0.0.1');
                await catalogUseCases.changeAssetStatus(asset.id, 'PENDING_INSPECTION');
            }

        } catch (error: any) {
            console.log(`Saltando asignación por error: ${error.message}`);
        }
    }

    console.log('✅ Seed completado con éxito!');
    process.exit(0);
}

seed().catch(err => {
    console.error('Error en seed:', err);
    process.exit(1);
});
