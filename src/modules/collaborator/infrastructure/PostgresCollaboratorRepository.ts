import { EntityManager, Repository } from 'typeorm';
import { AppDataSource } from '../../../shared/infrastructure/database/postgres';
import { Collaborator } from '../domain/Collaborator';
import { CollaboratorHistory } from '../domain/CollaboratorHistory';
import { ICollaboratorRepository } from '../domain/ICollaboratorRepository';
import { CollaboratorOrmEntity } from './orm/Collaborator.entity';
import { CollaboratorHistoryOrmEntity } from './orm/CollaboratorHistory.entity';

export class PostgresCollaboratorRepository implements ICollaboratorRepository {
    private repo: Repository<CollaboratorOrmEntity>;
    private historyRepo: Repository<CollaboratorHistoryOrmEntity>;

    constructor(manager: EntityManager = AppDataSource.manager) {
        this.repo = manager.getRepository(CollaboratorOrmEntity);
        this.historyRepo = manager.getRepository(CollaboratorHistoryOrmEntity);
    }

    async save(collaborator: Collaborator): Promise<void> {
        const ormEntity = this.repo.create({
            id: collaborator.id,
            name: collaborator.name,
            email: collaborator.email,
            department: collaborator.department,
            location: collaborator.location,
            status: collaborator.status,
            activation_date: collaborator.activationDate,
            deactivation_date: collaborator.deactivationDate || undefined,
            is_leader: collaborator.isLeader,
            leader_id: collaborator.leaderId || undefined,
            dynamic_attributes: collaborator.dynamicAttributes
        });
        await this.repo.save(ormEntity);
    }

    async update(collaborator: Collaborator): Promise<void> {
        await this.save(collaborator); // TypeORM save acts as upsert if ID exists
    }

    async findById(id: string): Promise<Collaborator | null> {
        const ormEntity = await this.repo.findOneBy({ id });
        if (!ormEntity) return null;
        return this.mapToDomain(ormEntity);
    }

    async findByEmail(email: string): Promise<Collaborator | null> {
        const ormEntity = await this.repo.findOneBy({ email });
        if (!ormEntity) return null;
        return this.mapToDomain(ormEntity);
    }

    async findAll(): Promise<Collaborator[]> {
        const ormEntities = await this.repo.find({ order: { name: 'ASC' } });
        return ormEntities.map(ormEntity => this.mapToDomain(ormEntity));
    }

    async findAllPaginated(page: number, limit: number): Promise<{ items: Collaborator[]; total: number }> {
        const [ormEntities, total] = await this.repo.findAndCount({
            order: { name: 'ASC' },
            skip: (page - 1) * limit,
            take: limit
        });
        return { items: ormEntities.map(ormEntity => this.mapToDomain(ormEntity)), total };
    }

    async saveHistory(history: CollaboratorHistory): Promise<void> {
        const ormEntity = this.historyRepo.create({
            id: history.id,
            collaborator_id: history.collaboratorId,
            action: history.action,
            timestamp: history.timestamp,
            reason: history.reason || undefined
        });
        await this.historyRepo.save(ormEntity);
    }

    async getHistory(collaboratorId: string): Promise<CollaboratorHistory[]> {
        const ormEntities = await this.historyRepo.find({ 
            where: { collaborator_id: collaboratorId },
            order: { timestamp: 'DESC' }
        });
        return ormEntities.map(orm => new CollaboratorHistory(
            orm.id,
            orm.collaborator_id,
            orm.action as any,
            orm.timestamp,
            orm.reason
        ));
    }

    private mapToDomain(ormEntity: CollaboratorOrmEntity): Collaborator {
        return new Collaborator(
            ormEntity.id,
            ormEntity.name,
            ormEntity.email,
            ormEntity.department,
            ormEntity.location,
            ormEntity.status as 'ACTIVE' | 'INACTIVE',
            ormEntity.activation_date,
            ormEntity.deactivation_date,
            ormEntity.created_at,
            ormEntity.is_leader,
            ormEntity.leader_id,
            ormEntity.dynamic_attributes
        );
    }
}
