import { AppDataSource } from '../shared/infrastructure/database/postgres';
import { CollaboratorUseCases } from '../modules/collaborator/application/CollaboratorUseCases';
import { PostgresCollaboratorRepository } from '../modules/collaborator/infrastructure/PostgresCollaboratorRepository';
import { PostgresCatalogRepository } from '../modules/catalog/infrastructure/PostgresCatalogRepository';
import { CatalogUseCases } from '../modules/catalog/application/CatalogUseCases';
import { PostgresAssignmentRepository } from '../modules/assignment/infrastructure/PostgresAssignmentRepository';
import { AssignmentUseCases } from '../modules/assignment/application/AssignmentUseCases';
import { Category } from '../modules/catalog/domain/Category';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
    console.log('🌱 Iniciando Seed de Datos...');
    
    await AppDataSource.initialize();
    console.log('✅ Base de datos conectada.');

    const collabRepo = new PostgresCollaboratorRepository();
    const collabUseCases = new CollaboratorUseCases(collabRepo);

    const catalogRepo = new PostgresCatalogRepository();
    const catalogUseCases = new CatalogUseCases(catalogRepo);

    const assignRepo = new PostgresAssignmentRepository();
    // Mock Mailer Service
    const mockMailer = {
        sendAssignmentEmail: async () => {},
        sendReturnEmail: async () => {}
    };
    const assignUseCases = new AssignmentUseCases(assignRepo, mockMailer);

    // 1. Crear Categorías base si no existen
    const categoriesData = [
        { id: 'laptop', name: 'Laptop', schema: { required: ['macAddress', 'processor', 'ram'] } },
        { id: 'mobile', name: 'Teléfono Móvil', schema: { required: ['imei', 'model'] } },
        { id: 'monitor', name: 'Monitor', schema: { required: ['resolution', 'size'] } }
    ];

    for (const c of categoriesData) {
        const exists = await catalogRepo.getCategoryById(c.id);
        if (!exists) {
            await catalogUseCases.createCategory(c.id, c.name, c.schema);
            console.log(`Categoría creada: ${c.name}`);
        }
    }

    // 2. Generar 15 Colaboradores (algunos inactivos)
    console.log('👤 Generando Colaboradores...');
    const departments = ['IT', 'Ventas', 'Marketing', 'Finanzas', 'Recursos Humanos', 'Operaciones'];
    const locations = ['CDMX HQ', 'Monterrey', 'Guadalajara', 'Remoto'];
    
    const collaborators = [];
    for (let i = 1; i <= 15; i++) {
        const collab = await collabUseCases.createCollaborator({
            name: `Colaborador Demo ${i}`,
            email: `demo${i}@ikusi.com`,
            department: departments[Math.floor(Math.random() * departments.length)],
            location: locations[Math.floor(Math.random() * locations.length)]
        });
        collaborators.push(collab);
        
        // Desactivar algunos
        if (i % 5 === 0) {
            await collabUseCases.toggleCollaboratorStatus(collab.id);
        }
    }

    // 3. Generar 30 Activos
    console.log('💻 Generando Activos...');
    const assets = [];
    for (let i = 1; i <= 30; i++) {
        const category = categoriesData[i % 3];
        const sampleAsset = new Asset({
            id: 'AST-2026-001',
            categoryId: 'cat-laptops',
            serial: 'SN-IKUSI-1234',
            status: 'AVAILABLE',
            dynamicAttributes: {
                modelo: 'ThinkPad T14',
                macAddress: '00:1B:44:11:3A:B7',
                procesador: 'Intel Core i7',
                ram: '16GB',
                disco_duro: '512GB SSD'
            }
        });
        const dynamicAttrs: any = {};
        
        if (category.id === 'laptop') {
            dynamicAttrs.macAddress = `00:1B:44:11:3A:${Math.floor(Math.random() * 99).toString().padStart(2, '0')}`;
            dynamicAttrs.processor = i % 2 === 0 ? 'Intel Core i7' : 'AMD Ryzen 7';
            dynamicAttrs.ram = '16GB';
            dynamicAttrs.warrantyEnd = new Date(Date.now() + Math.random() * 31536000000).toISOString().split('T')[0]; // Fecha en el prox año
        } else if (category.id === 'mobile') {
            dynamicAttrs.imei = `3589410${Math.floor(Math.random() * 10000000)}`;
            dynamicAttrs.model = i % 2 === 0 ? 'iPhone 13' : 'Samsung Galaxy S22';
            dynamicAttrs.warrantyEnd = new Date(Date.now() + (Math.random() * 60 - 15) * 86400000).toISOString().split('T')[0]; // Algunas por vencer
        } else {
            dynamicAttrs.resolution = '1920x1080';
            dynamicAttrs.size = '24 pulgadas';
        }

        const asset = await catalogUseCases.createAsset(
            `AST-2026-${i.toString().padStart(3, '0')}`,
            category.id,
            `SN-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
            dynamicAttrs
        );
        assets.push(asset);

        // Cambiar estados directamente en el repo para simular histórico
        if (i % 8 === 0) {
            // Activo retirado (dado de baja)
            const ormAsset = await AppDataSource.getRepository('AssetOrmEntity').findOneBy({ id: asset.id });
            if (ormAsset) {
                ormAsset.status = 'RETIRED';
                await AppDataSource.getRepository('AssetOrmEntity').save(ormAsset);
            }
        } else if (i % 7 === 0) {
            // Mantenimiento
            const ormAsset = await AppDataSource.getRepository('AssetOrmEntity').findOneBy({ id: asset.id });
            if (ormAsset) {
                ormAsset.status = 'IN_MAINTENANCE';
                await AppDataSource.getRepository('AssetOrmEntity').save(ormAsset);
            }
        }
    }

    // 4. Generar Asignaciones e Histórico
    console.log('🔄 Generando Asignaciones e Historial...');
    let availableAssets = assets.filter((_, i) => i % 8 !== 0 && i % 7 !== 0);

    for (let i = 0; i < 20; i++) {
        const asset = availableAssets.pop();
        if (!asset) break;

        const collab = collaborators[Math.floor(Math.random() * collaborators.length)];
        
        try {
            // Asignar
            const assignmentId = `assig-${uuidv4().substring(0,8)}`;
            const assignment = await assignUseCases.createAssignment(assignmentId, asset.id, collab.id, collab.email);
            
            // Aceptar la asignación (firmar virtualmente)
            const token = (assignment as any).props.signatureToken;
            await assignUseCases.acceptAssignment(assignmentId, token, '127.0.0.1', 'Seed Script');

            // Algunas asignaciones ya fueron devueltas en el pasado
            if (i % 3 === 0) {
                const returnedAssig = await assignUseCases.initiateReturn(assignmentId, collab.email);
                const returnToken = (returnedAssig as any).props.signatureToken;
                await assignUseCases.confirmReturn(assignmentId, returnToken, '127.0.0.1', 'Seed Script');
            } else if (i % 5 === 0) {
                // Forzar devolución
                await assignUseCases.forceReturn(assignmentId, '127.0.0.1');
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
