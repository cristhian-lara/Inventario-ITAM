import { IPermissionRepository } from '../domain/IPermissionRepository';
import { Role } from '../domain/Role';
import { User } from '../domain/User';

export interface PermissionFlags {
    read: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
}

export type PermissionsMap = Record<string, PermissionFlags>;

/**
 * Mapa moduleKey → flags que consume el frontend (menú, rutas y botones).
 * El SUPER_ADMIN recibe todos los módulos activos con acceso total.
 */
export const buildPermissionsMap = async (
    user: User,
    permissionRepository: IPermissionRepository
): Promise<PermissionsMap> => {
    const map: PermissionsMap = {};

    if (user.role === Role.SUPER_ADMIN) {
        const modules = await permissionRepository.findActiveModules();
        for (const module of modules) {
            map[module.key] = { read: true, create: true, edit: true, delete: true };
        }
        return map;
    }

    const permissions = await permissionRepository.findByUser(user.id);
    for (const p of permissions) {
        map[p.moduleKey] = { read: p.canRead, create: p.canCreate, edit: p.canEdit, delete: p.canDelete };
    }
    return map;
};
