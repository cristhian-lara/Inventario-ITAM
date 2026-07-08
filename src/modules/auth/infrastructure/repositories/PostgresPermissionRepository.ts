import { Repository } from 'typeorm';
import { AppDataSource } from '../../../../shared/infrastructure/database/postgres';
import { SystemModuleEntity } from '../orm/SystemModule.entity';
import { UserPermissionEntity } from '../orm/UserPermission.entity';
import { SystemModule } from '../../domain/SystemModule';
import { UserPermission } from '../../domain/UserPermission';
import { IPermissionRepository } from '../../domain/IPermissionRepository';

export class PostgresPermissionRepository implements IPermissionRepository {
    private moduleRepo: Repository<SystemModuleEntity>;
    private permissionRepo: Repository<UserPermissionEntity>;

    constructor() {
        this.moduleRepo = AppDataSource.getRepository(SystemModuleEntity);
        this.permissionRepo = AppDataSource.getRepository(UserPermissionEntity);
    }

    async findActiveModules(): Promise<SystemModule[]> {
        const entities = await this.moduleRepo.find({
            where: { isActive: true },
            order: { displayOrder: 'ASC' }
        });
        return entities.map(e => new SystemModule(e.id, e.key, e.name, e.displayOrder, e.isActive));
    }

    async findByUser(userId: string): Promise<UserPermission[]> {
        const entities = await this.permissionRepo.find({
            where: { userId },
            relations: { module: true }
        });
        return entities
            .filter(e => e.module?.isActive)
            .map(e => new UserPermission(e.userId, e.module.key, e.canRead, e.canCreate, e.canEdit, e.canDelete));
    }

    async replaceForUser(userId: string, permissions: UserPermission[]): Promise<void> {
        const modules = await this.moduleRepo.find();
        const moduleByKey = new Map(modules.map(m => [m.key, m]));

        await AppDataSource.transaction(async manager => {
            await manager.delete(UserPermissionEntity, { userId });
            for (const permission of permissions) {
                permission.normalize();
                if (!permission.hasAnyAccess()) continue; // sin acceso = sin fila
                const module = moduleByKey.get(permission.moduleKey);
                if (!module) continue;
                await manager.save(UserPermissionEntity, manager.create(UserPermissionEntity, {
                    userId,
                    moduleId: module.id,
                    canRead: permission.canRead,
                    canCreate: permission.canCreate,
                    canEdit: permission.canEdit,
                    canDelete: permission.canDelete,
                }));
            }
        });
    }
}
