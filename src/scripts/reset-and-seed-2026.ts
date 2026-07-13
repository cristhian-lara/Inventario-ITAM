/**
 * Reset y reseed integral (jul-2026): borra colaboradores/activos/mantenimientos
 * actuales y crea un set de datos de prueba realista (10 colaboradores, 30 activos,
 * historial de asignaciones/devoluciones/mantenimientos/bajas) para validar los
 * flujos de negocio de punta a punta. Mantiene departments/cecos/categories/users.
 *
 * Uso: npx ts-node src/scripts/reset-and-seed-2026.ts
 */
import { AppDataSource } from '../shared/infrastructure/database/postgres';
import { PostgresCollaboratorRepository } from '../modules/collaborator/infrastructure/PostgresCollaboratorRepository';
import { PostgresDepartmentRepository } from '../modules/collaborator/infrastructure/PostgresDepartmentRepository';
import { PostgresCecosRepository } from '../modules/collaborator/infrastructure/PostgresCecosRepository';
import { CollaboratorUseCases } from '../modules/collaborator/application/CollaboratorUseCases';
import { OffboardCollaboratorUseCase } from '../modules/collaborator/application/OffboardCollaboratorUseCase';
import { PostgresCatalogRepository } from '../modules/catalog/infrastructure/PostgresCatalogRepository';
import { CatalogUseCases } from '../modules/catalog/application/CatalogUseCases';
import { PostgresAssignmentRepository } from '../modules/assignment/infrastructure/PostgresAssignmentRepository';
import { AssignmentUseCases } from '../modules/assignment/application/AssignmentUseCases';
import { PostgresMaintenanceRepository } from '../modules/maintenance/infrastructure/PostgresMaintenanceRepository';
import { MaintenanceUseCases, IAssetAssignmentService } from '../modules/maintenance/application/MaintenanceUseCases';
import { WebexNotificationService } from '../shared/infrastructure/services/WebexNotificationService';
import { PdfKitService } from '../shared/infrastructure/services/PdfKitService';
import { IMailerService } from '../shared/contracts/IMailerService';
import { HardwareUpgradeOrmEntity } from '../modules/catalog/infrastructure/orm/HardwareUpgrade.entity';
import { v4 as uuidv4 } from 'uuid';

const mockMailer: IMailerService = {
    sendAssignmentEmail: async () => {},
    sendReturnEmail: async () => {},
    sendMaintenanceSignatureEmail: async () => {},
    sendFinalPdfEmail: async () => {}
};

function daysAgo(n: number): Date {
    return new Date(Date.now() - n * 86400000);
}
function daysFromNow(n: number): Date {
    return new Date(Date.now() + n * 86400000);
}
function ymd(d: Date): string {
    return d.toISOString().split('T')[0];
}

async function main() {
    console.log('🌱 Reset + Seed integral 2026 — iniciando...');
    await AppDataSource.initialize();
    console.log('✅ Base de datos conectada.');

    // --- 0. WIPE: colaboradores, activos, mantenimientos, asignaciones, upgrades ---
    // Se preservan: departments, cecos, categories, users.
    console.log('🧹 Borrando datos actuales (colaboradores, activos, asignaciones, mantenimientos, upgrades)...');
    await AppDataSource.query('DELETE FROM hardware_upgrades');
    await AppDataSource.query('DELETE FROM maintenances');
    await AppDataSource.query('DELETE FROM assignments');
    await AppDataSource.query('DELETE FROM collaborator_history');
    await AppDataSource.query('DELETE FROM assets');
    await AppDataSource.query('DELETE FROM collaborators');
    console.log('✅ Datos anteriores eliminados.');

    // --- Repos / use cases ---
    const collabRepo = new PostgresCollaboratorRepository();
    const departmentRepo = new PostgresDepartmentRepository();
    const cecosRepo = new PostgresCecosRepository();
    const collabUseCases = new CollaboratorUseCases(collabRepo, departmentRepo, cecosRepo);

    const catalogRepo = new PostgresCatalogRepository();
    const catalogUseCases = new CatalogUseCases(catalogRepo);

    const assignRepo = new PostgresAssignmentRepository();
    const assignUseCases = new AssignmentUseCases(assignRepo, mockMailer);

    const maintenanceRepo = new PostgresMaintenanceRepository(AppDataSource);
    const assignmentService: IAssetAssignmentService = {
        async getActiveAssignmentForAsset(assetId: string) {
            const a = await assignRepo.findActiveByAssetId(assetId);
            if (!a) return null;
            const collab = await collabRepo.findById(a.collaboratorId);
            if (!collab) return null;
            return { collaboratorId: collab.id, collaboratorName: collab.name, collaboratorEmail: collab.email };
        }
    };
    const maintenanceUseCases = new MaintenanceUseCases(maintenanceRepo, assignmentService, mockMailer);

    const documentService = new PdfKitService();
    const offboardUseCase = new OffboardCollaboratorUseCase(
        collabRepo, assignRepo, departmentRepo, cecosRepo, new WebexNotificationService(), documentService
    );

    // --- 1. CECOS: mantener 10104340 y agregar 3 nuevos con la misma estructura ---
    console.log('🏢 Verificando CECOS...');
    const cecosData = [
        { id: '10900321', name: 'Comercial Bogotá' },
        { id: '10900500', name: 'Finanzas Corporativo' },
        { id: '10900600', name: 'Recursos Humanos Nacional' }
    ];
    const existingCecos = await cecosRepo.findAll();
    for (const c of cecosData) {
        if (!existingCecos.some(e => e.id === c.id)) {
            await collabUseCases.createCecos(c.id, c.name, `CECOS ${c.name}`);
            console.log(`  CECOS creado: ${c.id} - ${c.name}`);
        }
    }

    // --- 2. Categorías: reutilizar "Computadores"; crear "Monitores" y "Periféricos" ---
    console.log('📦 Verificando categorías...');
    let categories = await catalogUseCases.getAllCategories();
    let computadoresCat = categories.find(c => c.name === 'Computadores');
    if (!computadoresCat) throw new Error('No se encontró la categoría "Computadores" (se esperaba que ya existiera).');

    let monitoresCat = categories.find(c => c.name === 'Monitores');
    if (!monitoresCat) {
        await catalogUseCases.createCategory('Monitores', {
            requiresPlacaIkusi: true,
            fields: [
                { name: 'Marca', type: 'select', options: ['Dell', 'LG', 'Samsung', 'HP'], isRequired: true },
                { name: 'Tamaño', type: 'select', options: ['21.5"', '24"', '27"'], isRequired: true },
                { name: 'Resolución', type: 'select', options: ['FHD 1920x1080', '2K', '4K'], isRequired: true }
            ]
        });
        console.log('  Categoría creada: Monitores');
    }

    let perifericosCat = categories.find(c => c.name === 'Periféricos');
    if (!perifericosCat) {
        await catalogUseCases.createCategory('Periféricos', {
            requiresPlacaIkusi: true,
            fields: [
                { name: 'Tipo', type: 'select', options: ['Mouse', 'Teclado', 'Diadema', 'Webcam', 'Docking Station'], isRequired: true },
                { name: 'Marca', type: 'text', isRequired: true }
            ]
        });
        console.log('  Categoría creada: Periféricos');
    }

    categories = await catalogUseCases.getAllCategories();
    computadoresCat = categories.find(c => c.name === 'Computadores')!;
    monitoresCat = categories.find(c => c.name === 'Monitores')!;
    perifericosCat = categories.find(c => c.name === 'Periféricos')!;

    // --- 3. Colaboradores (10): Soporte TI + Cristhian Lara + 8 nuevos ---
    console.log('👤 Generando colaboradores...');
    const departments = await departmentRepo.findAll();
    const deptByName = (n: string) => departments.find(d => d.name.toLowerCase() === n.toLowerCase())!;

    const collaboratorsData = [
        { name: 'Cristhian Lara', email: 'angieurechelopez@gmail.com', department: 'Operaciones', location: 'Bogotá', isLeader: true, cecos: '10104340' },
        { name: 'Soporte IKusi', email: 'Soporte.ti.co@ikusi.com', department: 'Operaciones', location: 'Bogotá', cecos: '10104340' },
        { name: 'Juliana Restrepo Gómez', email: 'juliana.restrepo82@gmail.com', department: 'Comercial', location: 'Medellín', cecos: '10900321' },
        { name: 'Andrés Felipe Torres', email: 'andres.torres.tec@hotmail.com', department: 'Finanzas', location: 'Bogotá', cecos: '10900500' },
        { name: 'Camila Andrea Ríos', email: 'camila.rios1990@gmail.com', department: 'Recursos Humanos', location: 'Cali', cecos: '10900600' },
        { name: 'Santiago Bermúdez', email: 'santiago.bermudez@outlook.com', department: 'Seguridad', location: 'Bogotá' },
        { name: 'Laura Valentina Cárdenas', email: 'laura.cardenas.v@gmail.com', department: 'Operaciones', location: 'Bogotá', cecos: '10104340' },
        { name: 'Diego Alejandro Muñoz', email: 'diego.munoz.dev@gmail.com', department: 'Comercial', location: 'Barranquilla', cecos: '10900321' },
        { name: 'Natalia Gómez Salazar', email: 'natalia.gomez.s@hotmail.com', department: 'Finanzas', location: 'Remoto', cecos: '10900500' },
        { name: 'Mateo Rodríguez Peña', email: 'mateo.rodriguez.p@gmail.com', department: 'Recursos Humanos', location: 'Bogotá', cecos: '10900600' }
    ];

    const collaborators: Record<string, any> = {};
    for (const c of collaboratorsData) {
        const dept = deptByName(c.department);
        const collab = await collabUseCases.createCollaborator({
            name: c.name,
            email: c.email,
            department: dept.id as number,
            location: c.location,
            isLeader: c.isLeader || false,
            dynamicAttributes: c.cecos ? { CECOS: c.cecos } : {}
        });
        collaborators[c.name] = collab;
        console.log(`  Colaborador creado: ${c.name} <${c.email}>`);
    }

    // --- 4. Activos (30): 15 Computadores + 10 Monitores + 5 Periféricos ---
    console.log('💻 Generando activos...');
    const marcasComputo = ['Lenovo', 'HP'];
    const modelosComputo = ['ProBook 440 G9', 'EliteBook 840 G5', 'Elitebook 840 G9', 'ProBook 440 G8'];
    const ramOpciones = ['8', '16', '32'];
    const procesadores = ['Intel core i3', 'Intel core i5', 'Intel core i7'];
    const osOpciones = ['W10', 'W11'];

    const assets: any[] = [];
    let placaSeq = 1;

    for (let i = 1; i <= 15; i++) {
        const placa = `IT-${placaSeq.toString().padStart(4, '0')}`;
        const hostname = `NBCO${placaSeq.toString().padStart(4, '0')}`;
        placaSeq++;
        const asset = await catalogUseCases.createAsset(
            placa,
            computadoresCat.id as number,
            `SN-COMP-${placaSeq}`,
            {
                Marca: marcasComputo[i % marcasComputo.length],
                Modelo: modelosComputo[i % modelosComputo.length],
                'Memoria RAM': ramOpciones[i % ramOpciones.length],
                Procesador: procesadores[i % procesadores.length],
                'Versión OS': osOpciones[i % osOpciones.length],
                Hostname: hostname
            },
            daysAgo(365 + i * 5),
            36,
            3,
            2800000 + i * 15000,
            'Dell Colombia S.A.S',
            'Compras Corporativas'
        );
        assets.push(asset);
    }
    console.log('  15 Computadores creados (IT-0001..IT-0015, hostnames NBCO0001..NBCO0015).');

    const marcasMonitor = ['Dell', 'LG', 'Samsung', 'HP'];
    const tamanos = ['21.5"', '24"', '27"'];
    const resoluciones = ['FHD 1920x1080', '2K', '4K'];
    for (let i = 1; i <= 10; i++) {
        const placa = `IT-${placaSeq.toString().padStart(4, '0')}`;
        placaSeq++;
        const asset = await catalogUseCases.createAsset(
            placa,
            monitoresCat.id as number,
            `SN-MON-${placaSeq}`,
            {
                Marca: marcasMonitor[i % marcasMonitor.length],
                Tamaño: tamanos[i % tamanos.length],
                Resolución: resoluciones[i % resoluciones.length]
            },
            daysAgo(300 + i * 4),
            24,
            5,
            650000 + i * 8000,
            'PC Center Colombia',
            'Compras Corporativas'
        );
        assets.push(asset);
    }
    console.log('  10 Monitores creados (IT-0016..IT-0025).');

    const tiposPeriferico = ['Mouse', 'Teclado', 'Diadema', 'Webcam', 'Docking Station'];
    for (let i = 1; i <= 5; i++) {
        const placa = `IT-${placaSeq.toString().padStart(4, '0')}`;
        placaSeq++;
        const asset = await catalogUseCases.createAsset(
            placa,
            perifericosCat.id as number,
            `SN-PER-${placaSeq}`,
            {
                Tipo: tiposPeriferico[i % tiposPeriferico.length],
                Marca: 'Logitech'
            },
            daysAgo(120 + i * 3),
            12,
            2,
            85000 + i * 5000,
            'Logitech Colombia',
            'Compras Corporativas'
        );
        assets.push(asset);
    }
    console.log('  5 Periféricos creados (IT-0026..IT-0030).');

    const assetById = (id: string) => assets.find(a => a.id === id);

    // --- 5. Asignaciones e historial (permanentes y préstamos) ---
    console.log('🔄 Generando asignaciones...');
    const cLara = collaborators['Cristhian Lara'];
    const cSoporte = collaborators['Soporte IKusi'];
    const cJuliana = collaborators['Juliana Restrepo Gómez'];
    const cAndres = collaborators['Andrés Felipe Torres'];
    const cCamila = collaborators['Camila Andrea Ríos'];
    const cSantiago = collaborators['Santiago Bermúdez'];
    const cLaura = collaborators['Laura Valentina Cárdenas'];
    const cDiego = collaborators['Diego Alejandro Muñoz'];
    const cNatalia = collaborators['Natalia Gómez Salazar'];
    const cMateo = collaborators['Mateo Rodríguez Peña'];

    async function assignPermanentAndAccept(assetId: string, collab: any, startDaysAgo: number) {
        const id = `assig-${uuidv4().substring(0, 8)}`;
        const { token } = await assignUseCases.createAssignment(id, assetId, collab.id, collab.email, ymd(daysAgo(startDaysAgo)), 'PERMANENT');
        await assignUseCases.acceptAssignment(id, token, '190.85.10.20', 'Seed Script');
        await catalogUseCases.changeAssetStatus(assetId, 'IN_USE');
        return id;
    }

    async function assignLoanAndAccept(assetId: string, collab: any, startDaysAgo: number, expectedReturnDaysFromNow: number) {
        const id = `assig-${uuidv4().substring(0, 8)}`;
        const { token } = await assignUseCases.createAssignment(id, assetId, collab.id, collab.email, ymd(daysAgo(startDaysAgo)), 'LOAN', ymd(daysFromNow(expectedReturnDaysFromNow)));
        await assignUseCases.acceptAssignment(id, token, '190.85.10.21', 'Seed Script');
        await catalogUseCases.changeAssetStatus(assetId, 'IN_USE');
        return id;
    }

    // Asignaciones permanentes activas (computadores)
    const assignLaraComp = await assignPermanentAndAccept('IT-0001', cLara, 200);
    await assignPermanentAndAccept('IT-0002', cSoporte, 190);
    await assignPermanentAndAccept('IT-0003', cJuliana, 150);
    await assignPermanentAndAccept('IT-0004', cAndres, 140);
    const assignCamilaComp = await assignPermanentAndAccept('IT-0005', cCamila, 120);
    await assignPermanentAndAccept('IT-0006', cSantiago, 100);
    await assignPermanentAndAccept('IT-0007', cLaura, 90);

    // Monitores asignados junto a algunos colaboradores (permanente)
    await assignPermanentAndAccept('IT-0016', cLara, 200);
    await assignPermanentAndAccept('IT-0017', cJuliana, 150);
    const assignDiegoMon = await assignPermanentAndAccept('IT-0018', cDiego, 80);

    // Préstamos (LOAN) con fecha esperada de devolución
    const loanNatalia = await assignLoanAndAccept('IT-0026', cNatalia, 10, 20); // diadema en préstamo, vence en 20 días
    const loanMateo = await assignLoanAndAccept('IT-0027', cMateo, 30, -5); // préstamo YA vencido (venció hace 5 días)

    // Asignación pendiente de firma (aún no aceptada) — deja el activo en PENDING_ACCEPTANCE
    const pendingId = `assig-${uuidv4().substring(0, 8)}`;
    await assignUseCases.createAssignment(pendingId, 'IT-0019', cDiego.id, cDiego.email, ymd(new Date()), 'PERMANENT');
    console.log('  Asignación IT-0019 dejada en PENDING_ACCEPTANCE para probar el flujo de firma.');

    // --- 6. Devoluciones: normal con Visto Bueno, y forzada ---
    console.log('↩️  Generando devoluciones...');
    // Devolución normal + Visto Bueno (libera el activo)
    {
        const { token } = await assignUseCases.initiateReturn(assignCamilaComp, cCamila.email);
        await assignUseCases.confirmReturn(assignCamilaComp, token, '190.85.10.22', 'Seed Script');
        await catalogUseCases.changeAssetStatus('IT-0005', 'PENDING_INSPECTION');
        await assignUseCases.approveReturn(assignCamilaComp, 'admin', 'Visto Bueno de demostración (seed)');
        await catalogUseCases.changeAssetStatus('IT-0005', 'AVAILABLE');
    }
    // Devolución normal SIN Visto Bueno todavía (queda bloqueado en PENDING_INSPECTION)
    {
        const { token } = await assignUseCases.initiateReturn(assignDiegoMon, cDiego.email);
        await assignUseCases.confirmReturn(assignDiegoMon, token, '190.85.10.23', 'Seed Script');
        await catalogUseCases.changeAssetStatus('IT-0018', 'PENDING_INSPECTION');
    }
    // Devolución forzada por administrador (préstamo vencido)
    {
        await assignUseCases.forceReturn(loanMateo, '190.85.10.24');
        await catalogUseCases.changeAssetStatus('IT-0027', 'PENDING_INSPECTION');
    }
    // Extensión de préstamo activo (Natalia, diadema IT-0026)
    await assignUseCases.extendLoanReturnDate(loanNatalia, ymd(daysFromNow(45)));
    console.log('  Devoluciones y extensión de préstamo generadas.');

    // --- 7. Baja de colaborador con Paz y Salvo (offboarding) ---
    console.log('🚪 Generando baja de colaborador (Paz y Salvo)...');
    // Santiago tiene un activo permanente (IT-0006) asignado; se le da de baja administrativa.
    const offboardResult = await offboardUseCase.execute(cSantiago.id, 'Fin de contrato con la compañía (seed de prueba)');
    console.log(`  Colaborador ${cSantiago.name} dado de baja. Activos devueltos: ${offboardResult.returnedCount}. Acta: ${offboardResult.documentPath || 'N/A'}`);

    // --- 8. Baja (retiro) de activos ---
    console.log('🗑️  Generando bajas de activos...');
    // IT-0028 (periférico) nunca asignado -> se puede retirar directo desde AVAILABLE
    await catalogUseCases.decommissionAsset('IT-0028', {
        reason: 'Equipo dañado sin posibilidad de reparación (seed de prueba)',
        authorizedBy: 'Cristhian Lara',
        notes: 'Diadema con micrófono averiado, se gestiona baja definitiva.'
    });
    // IT-0005 (ya disponible tras devolución con Visto Bueno) también se retira
    await catalogUseCases.decommissionAsset('IT-0005', {
        reason: 'Obsolescencia tecnológica (seed de prueba)',
        authorizedBy: 'Cristhian Lara',
        blanccoReportId: 'BLANCCO-2026-0088',
        notes: 'Baja programada por renovación de flota de cómputo.'
    });
    console.log('  2 activos dados de baja (IT-0028, IT-0005).');

    // --- 9. Upgrades de hardware ---
    console.log('🔧 Registrando upgrades de hardware...');
    const upgradeRepo = AppDataSource.getRepository(HardwareUpgradeOrmEntity);
    await upgradeRepo.save(upgradeRepo.create({
        id: `upg-${uuidv4().substring(0, 8)}`,
        asset_id: 'IT-0001',
        upgrade_date: daysAgo(60),
        component: 'RAM',
        old_value: '8GB',
        new_value: '16GB',
        performed_by: 'Soporte IKusi',
        notes: 'Upgrade solicitado por lentitud reportada por el usuario (seed).'
    }));
    await upgradeRepo.save(upgradeRepo.create({
        id: `upg-${uuidv4().substring(0, 8)}`,
        asset_id: 'IT-0003',
        upgrade_date: daysAgo(30),
        component: 'Disco Duro',
        old_value: '256GB SSD',
        new_value: '512GB SSD',
        performed_by: 'Soporte IKusi',
        notes: 'Cambio preventivo por espacio insuficiente (seed).'
    }));
    console.log('  2 upgrades de hardware registrados.');

    // --- 10. Mantenimientos: preventivos/correctivos, históricos y en curso ---
    console.log('🛠️  Generando mantenimientos...');

    // Histórico COMPLETO — preventivo, hace 2 meses
    {
        const record = await maintenanceUseCases.createManualMaintenance({
            assetId: 'IT-0002',
            type: 'PREVENTIVE',
            scheduledDate: daysAgo(65),
            reason: 'Mantenimiento preventivo semestral (seed histórico).'
        });
        await maintenanceUseCases.startMaintenance(record.id, 'Iniciado por técnico (seed).');
        const { record: completed } = await maintenanceUseCases.completeMaintenance(
            record.id,
            'Limpieza interna, actualización de drivers y verificación de batería. Sin novedades.',
            daysAgo(64),
            daysAgo(64)
        );
        console.log(`  Mantenimiento histórico completado: ${completed.id} (IT-0002, preventivo).`);
    }

    // Histórico COMPLETO — correctivo, hace 3 semanas
    {
        const record = await maintenanceUseCases.createManualMaintenance({
            assetId: 'IT-0004',
            type: 'CORRECTIVE',
            scheduledDate: daysAgo(22),
            reason: 'El equipo presentó pantallazos azules recurrentes (seed histórico).'
        });
        await maintenanceUseCases.startMaintenance(record.id, 'Diagnóstico iniciado (seed).');
        const { record: completed } = await maintenanceUseCases.completeMaintenance(
            record.id,
            'Se reemplazó módulo de RAM defectuoso. Equipo estable tras pruebas de estrés.',
            daysAgo(21),
            daysAgo(20)
        );
        console.log(`  Mantenimiento histórico completado: ${completed.id} (IT-0004, correctivo).`);
    }

    // EN PROGRESO — sobre un activo actualmente asignado (Cristhian Lara, IT-0001)
    {
        const record = await maintenanceUseCases.createManualMaintenance({
            assetId: 'IT-0001',
            type: 'PREVENTIVE',
            scheduledDate: daysAgo(1),
            reason: 'Mantenimiento preventivo anual (seed en progreso).'
        });
        await maintenanceUseCases.startMaintenance(record.id, 'Técnico en sitio revisando el equipo (seed).');
        console.log(`  Mantenimiento EN PROGRESO creado: ${record.id} (IT-0001).`);
    }

    // PROGRAMADO (futuro) — sobre activo asignado, para validar "usuario en turno" antes de iniciar
    {
        const record = await maintenanceUseCases.createManualMaintenance({
            assetId: 'IT-0003',
            type: 'PREVENTIVE',
            scheduledDate: daysFromNow(7),
            reason: 'Mantenimiento preventivo programado (seed).'
        });
        console.log(`  Mantenimiento PROGRAMADO creado: ${record.id} (IT-0003, dentro de 7 días).`);
    }

    // CANCELADO — para cubrir el estado
    {
        const record = await maintenanceUseCases.createManualMaintenance({
            assetId: 'IT-0007',
            type: 'CORRECTIVE',
            scheduledDate: daysAgo(5),
            reason: 'Reporte de teclado con teclas fantasma (seed).'
        });
        // No existe caso de uso de cancelación expuesto; se deja registrado como ejemplo
        // de mantenimiento SCHEDULED que quedó sin atender (hallazgo a documentar).
        console.log(`  Mantenimiento SCHEDULED sin atender creado: ${record.id} (IT-0007) — no se encontró caso de uso "cancelar".`);
    }

    console.log('✅ Reset + Seed integral completado con éxito.');
    await AppDataSource.destroy();
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Error en reset-and-seed-2026:', err);
    process.exit(1);
});
