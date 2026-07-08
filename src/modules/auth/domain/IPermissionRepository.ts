import { SystemModule } from './SystemModule';
import { UserPermission } from './UserPermission';

export interface IPermissionRepository {
    /** Módulos activos del sistema, ordenados para la matriz de permisos. */
    findActiveModules(): Promise<SystemModule[]>;
    /** Permisos de un usuario (por clave de módulo). */
    findByUser(userId: string): Promise<UserPermission[]>;
    /** Reemplaza la matriz completa de permisos de un usuario. */
    replaceForUser(userId: string, permissions: UserPermission[]): Promise<void>;
}
