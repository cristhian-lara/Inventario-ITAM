import { Asset } from '../../../modules/catalog/domain/Asset';
import { Category } from '../../../modules/catalog/domain/Category';
import { ICollaboratorRepository } from '../../../modules/collaborator/domain/ICollaboratorRepository';
import { IDepartmentRepository } from '../../../modules/collaborator/domain/IDepartmentRepository';
import { AssignmentDocumentData } from '../../../shared/contracts/IDocumentService';

/**
 * Item de la lista `assets` de un acta (asignación/devolución). Mapea un activo
 * de catálogo (con sus atributos dinámicos, que varían por categoría) a los
 * campos fijos que espera el generador de PDF, con los mismos fallbacks
 * multi-clave usados en todos los flujos de asignación/devolución.
 */
export function buildAssetActItem(
    asset: Asset | null,
    category: Category | null,
    assignmentLike: { assetId: string; startDate: Date }
): AssignmentDocumentData['assets'][number] {
    const requiresPlaca = category ? category.schemaDefinition.requiresPlacaIkusi !== false : true;
    const attrs = asset?.dynamicAttributes;
    return {
        assetId: assignmentLike.assetId,
        assignmentDate: assignmentLike.startDate,
        assetSerial: asset ? (asset.serial || 'N/A') : 'N/A',
        assetType: category ? category.name : 'Laptop',
        assetBrand: attrs ? (attrs.marca || attrs.Marca || attrs.brand || attrs.Brand) || 'Generico' : 'Generico',
        assetHostname: attrs ? (attrs.hostname || attrs.Hostname) || 'N/A' : 'N/A',
        assetVersionOs: attrs ? (attrs.versionOs || attrs.VersionOS || attrs['Version OS'] || attrs['Versión OS'] || attrs['Sistema Operativo'] || attrs['Sistema operativo'] || attrs['SistemaOperativo'] || attrs['OS'] || attrs['os']) || 'N/A' : 'N/A',
        assetModel: attrs ? (attrs.modelo || attrs.Modelo) || 'Generico' : 'Generico',
        assetMac: attrs ? (attrs.macAddress || attrs.MacAddress || attrs.MAC || attrs['MAC Address']) || 'N/A' : 'N/A',
        assetRam: attrs ? (attrs.ram || attrs.RAM || attrs.Ram || attrs['Memoria RAM']) || 'N/A' : 'N/A',
        assetProcessor: attrs ? (attrs.processor || attrs.Processor || attrs.Procesador || attrs.procesador) || 'N/A' : 'N/A',
        assetStorage: attrs ? (attrs.storage || attrs.Storage || attrs.Almacenamiento || attrs.Disco) || 'N/A' : 'N/A',
        requiresPlacaIkusi: requiresPlaca
    };
}

/** Nombre de departamento con el mismo fallback (id crudo si no se encuentra o falla la consulta) usado en todos los flujos. */
export async function resolveDepartmentName(department: string | number | null | undefined, departmentRepo: IDepartmentRepository): Promise<string> {
    if (!department) return 'Sistemas';
    try {
        const dept = await departmentRepo.findById(Number(department));
        return dept ? dept.name : department.toString();
    } catch (e) {
        return department.toString();
    }
}

/** CECOS del colaborador, tolerando las variantes de clave con las que se ha importado históricamente. */
export function extractCeco(dynamicAttributes?: Record<string, any> | null): string {
    return dynamicAttributes ? (dynamicAttributes['CECOS'] || dynamicAttributes['cecos'] || dynamicAttributes['CECO'] || 'N/A') : 'N/A';
}

export interface CollaboratorActContext {
    ceco: string;
    sede: string;
    realColName: string;
    realColEmail: string;
    realDept: string;
}

/** Datos del colaborador para el acta, con los mismos valores por defecto usados en todos los flujos cuando el colaborador no existe. */
export async function resolveCollaboratorActContext(
    collaboratorId: string,
    collaboratorRepo: ICollaboratorRepository,
    departmentRepo: IDepartmentRepository,
    fallbackName?: string
): Promise<CollaboratorActContext> {
    const collaborator = await collaboratorRepo.findById(collaboratorId);
    return {
        ceco: extractCeco(collaborator?.dynamicAttributes),
        sede: collaborator ? collaborator.location : 'N/A',
        realColName: collaborator ? collaborator.name : (fallbackName || collaboratorId),
        realColEmail: collaborator ? collaborator.email : 'test@ikusi.com',
        realDept: await resolveDepartmentName(collaborator?.department, departmentRepo)
    };
}
