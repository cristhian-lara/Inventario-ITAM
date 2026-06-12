import { In } from 'typeorm';
import { AppDataSource } from '../../../shared/infrastructure/database/postgres';
import { Assignment, AssignmentStatus } from '../domain/Assignment';
import { IAssignmentRepository } from '../domain/IAssignmentRepository';
import { AssignmentOrmEntity } from './orm/Assignment.entity';

export class PostgresAssignmentRepository implements IAssignmentRepository {
    private repo = AppDataSource.getRepository(AssignmentOrmEntity);

    async save(assignment: Assignment): Promise<void> {
        const ormEntity = this.repo.create({
            id: assignment.id,
            asset_id: assignment.assetId,
            collaborator_id: assignment.collaboratorId,
            status: assignment.status,
            start_date: assignment.startDate,
            end_date: assignment.endDate,
            signature_token: assignment.signatureToken,
            signature_metadata: assignment.signatureMetadata
        });
        await this.repo.save(ormEntity);
    }

    async findById(id: string): Promise<Assignment | null> {
        const ormEntity = await this.repo.findOneBy({ id });
        if (!ormEntity) return null;

        return new Assignment({
            id: ormEntity.id,
            assetId: ormEntity.asset_id,
            collaboratorId: ormEntity.collaborator_id,
            status: ormEntity.status as AssignmentStatus,
            startDate: ormEntity.start_date,
            endDate: ormEntity.end_date,
            signatureToken: ormEntity.signature_token,
            signatureMetadata: ormEntity.signature_metadata
        });
    }

    async findAllActive(): Promise<Assignment[]> {
        const ormEntities = await this.repo.find({ 
            where: { status: In(['ACCEPTED', 'PENDING_ACCEPTANCE', 'PENDING_RETURN']) } 
        });
        return ormEntities.map(ormEntity => new Assignment({
            id: ormEntity.id,
            assetId: ormEntity.asset_id,
            collaboratorId: ormEntity.collaborator_id,
            status: ormEntity.status as AssignmentStatus,
            startDate: ormEntity.start_date,
            endDate: ormEntity.end_date,
            signatureToken: ormEntity.signature_token,
            signatureMetadata: ormEntity.signature_metadata
        }));
    }

    async findActiveByAssetId(assetId: string): Promise<Assignment | null> {
        const ormEntity = await this.repo.findOne({ where: { asset_id: assetId, status: 'ACCEPTED' } });
        if (!ormEntity) return null;

        return new Assignment({
            id: ormEntity.id,
            assetId: ormEntity.asset_id,
            collaboratorId: ormEntity.collaborator_id,
            status: ormEntity.status as AssignmentStatus,
            startDate: ormEntity.start_date,
            endDate: ormEntity.end_date,
            signatureToken: ormEntity.signature_token,
            signatureMetadata: ormEntity.signature_metadata
        });
    }

    async findCurrentByAssetId(assetId: string): Promise<Assignment | null> {
        const ormEntity = await this.repo.createQueryBuilder('assignment')
            .where('assignment.asset_id = :assetId', { assetId })
            .andWhere('assignment.status IN (:...statuses)', { statuses: ['PENDING_ACCEPTANCE', 'ACCEPTED', 'PENDING_RETURN'] })
            .getOne();
            
        if (!ormEntity) return null;

        return new Assignment({
            id: ormEntity.id,
            assetId: ormEntity.asset_id,
            collaboratorId: ormEntity.collaborator_id,
            status: ormEntity.status as AssignmentStatus,
            startDate: ormEntity.start_date,
            endDate: ormEntity.end_date,
            signatureToken: ormEntity.signature_token,
            signatureMetadata: ormEntity.signature_metadata
        });
    }
}
