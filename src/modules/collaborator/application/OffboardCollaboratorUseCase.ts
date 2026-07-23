import { randomUUID as uuidv4 } from 'crypto';
import { AppDataSource } from '../../../shared/infrastructure/database/postgres';
import { IMailerService } from '../../../shared/contracts/IMailerService';
import { IDocumentService } from '../../../shared/contracts/IDocumentService';
import { PostgresAssignmentRepository } from '../../assignment/infrastructure/PostgresAssignmentRepository';
import { AssignmentUseCases } from '../../assignment/application/AssignmentUseCases';
import { PostgresCatalogRepository } from '../../catalog/infrastructure/PostgresCatalogRepository';
import { CatalogUseCases } from '../../catalog/application/CatalogUseCases';
import { PostgresCollaboratorRepository } from '../infrastructure/PostgresCollaboratorRepository';
import { CollaboratorUseCases } from './CollaboratorUseCases';
import { CollaboratorHistory } from '../domain/CollaboratorHistory';
import { Collaborator } from '../domain/Collaborator';
import { ICollaboratorRepository } from '../domain/ICollaboratorRepository';
import { IAssignmentRepository } from '../../assignment/domain/IAssignmentRepository';
import { IDepartmentRepository } from '../domain/IDepartmentRepository';
import { ICecosRepository } from '../domain/ICecosRepository';
import { buildAssetActItem, resolveDepartmentName, extractCeco } from '../../../api/routes/helpers/assignmentActHelpers';

export interface OffboardResult {
    updatedCollaborator: Collaborator;
    documentPath?: string;
    returnedCount: number;
    /** Activos devueltos en la baja (para cancelar sus preventivos programados, etc.). */
    returnedAssetIds: string[];
}

/**
 * Baja de colaborador con devolución forzada de TODOS sus activos asignados
 * y generación de un único acta de Paz y Salvo. Operación administrativa
 * inmediata (sin esperar firma del colaborador): pensada para offboarding.
 */
export class OffboardCollaboratorUseCase {
    constructor(
        private readonly collaboratorRepo: ICollaboratorRepository,
        private readonly assignmentRepo: IAssignmentRepository,
        private readonly departmentRepo: IDepartmentRepository,
        private readonly cecosRepo: ICecosRepository,
        private readonly notificationService: IMailerService,
        private readonly documentService: IDocumentService
    ) { }

    async execute(id: string, reason: string): Promise<OffboardResult> {
        const collaborator = await this.collaboratorRepo.findById(id);
        if (!collaborator) throw new Error('Colaborador no encontrado');
        if (collaborator.status !== 'ACTIVE') {
            throw new Error('El colaborador ya se encuentra inactivo.');
        }

        const allActive = await this.assignmentRepo.findAllActive();
        const toReturn = allActive.filter(a => a.collaboratorId === id && (a.status === 'ACCEPTED' || a.status === 'PENDING_ACCEPTANCE'));

        // Toda la operación (devoluciones + cambio de estado de activos + acta +
        // baja del colaborador) corre en una única transacción: si falla cualquier
        // paso (incluida la generación del PDF), no debe quedar ningún activo
        // marcado como devuelto ni el colaborador dado de baja a medias.
        const result = await AppDataSource.manager.transaction(async (manager) => {
            const txAssignmentRepo = new PostgresAssignmentRepository(manager);
            const txAssignmentUseCases = new AssignmentUseCases(txAssignmentRepo, this.notificationService);
            const txCatalogRepo = new PostgresCatalogRepository(manager);
            const txCatalogUseCases = new CatalogUseCases(txCatalogRepo);
            const txCollaboratorRepo = new PostgresCollaboratorRepository(manager);
            const txCollaboratorUseCases = new CollaboratorUseCases(txCollaboratorRepo, this.departmentRepo, this.cecosRepo);

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

                const realDept = await resolveDepartmentName(collaborator.department, this.departmentRepo);
                const ceco = extractCeco(collaborator.dynamicAttributes);

                // Generación del PDF dentro de la transacción a propósito: si falla,
                // el rollback deshace las devoluciones y los cambios de estado de activos.
                documentPath = await this.documentService.generateAssignmentAct({
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

        return { ...result, returnedCount: toReturn.length, returnedAssetIds: toReturn.map(a => a.assetId) };
    }
}
