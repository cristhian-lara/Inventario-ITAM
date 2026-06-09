import { AppDataSource } from '../../../shared/infrastructure/database/postgres';
import { Department } from '../domain/Department';
import { IDepartmentRepository } from '../domain/IDepartmentRepository';
import { DepartmentOrmEntity } from './orm/Department.entity';

export class PostgresDepartmentRepository implements IDepartmentRepository {
    private repo = AppDataSource.getRepository(DepartmentOrmEntity);

    async save(department: Department): Promise<void> {
        const ormEntity = this.repo.create({
            id: department.id,
            name: department.name,
            description: department.description || undefined,
            created_at: department.createdAt
        });
        await this.repo.save(ormEntity);
    }

    async findById(id: string): Promise<Department | null> {
        const ormEntity = await this.repo.findOneBy({ id });
        if (!ormEntity) return null;
        
        return new Department(
            ormEntity.id,
            ormEntity.name,
            ormEntity.description,
            ormEntity.created_at
        );
    }

    async findAll(): Promise<Department[]> {
        const ormEntities = await this.repo.find({ order: { name: 'ASC' } });
        return ormEntities.map(ormEntity => new Department(
            ormEntity.id,
            ormEntity.name,
            ormEntity.description,
            ormEntity.created_at
        ));
    }
}
