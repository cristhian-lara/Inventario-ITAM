import { EntityManager, In, Repository } from 'typeorm';
import { AppDataSource } from '../../../shared/infrastructure/database/postgres';
import { Assignment, AssignmentStatus, AssignmentType } from '../domain/Assignment';
import { IAssignmentRepository } from '../domain/IAssignmentRepository';
import { AssignmentOrmEntity } from './orm/Assignment.entity';

export class PostgresAssignmentRepository implements IAssignmentRepository {
    private repo: Repository<AssignmentOrmEntity>;

    constructor(manager: EntityManager = AppDataSource.manager) {
        this.repo = manager.getRepository(AssignmentOrmEntity);
    }

    async save(assignment: Assignment): Promise<void> {
        const ormEntity = this.repo.create({
            id: assignment.id,
            asset_id: assignment.assetId,
            collaborator_id: assignment.collaboratorId,
            status: assignment.status,
            assignment_type: assignment.assignmentType,
            start_date: assignment.startDate,
            end_date: assignment.endDate,
            expected_return_date: assignment.expectedReturnDate,
            last_alert_sent_at: assignment.lastAlertSentAt,
            signature_token: assignment.signatureToken,
            signature_metadata: assignment.signatureMetadata,
            document_path: assignment.documentPath || undefined,
            admin_approval: assignment.adminApproval
        });
        await this.repo.save(ormEntity);
    }

    async findById(id: string): Promise<Assignment | null> {
        const ormEntity = await this.repo.findOneBy({ id });
        return ormEntity ? this.mapToDomain(ormEntity) : null;
    }

    async findByIds(ids: string[]): Promise<Assignment[]> {
        if (ids.length === 0) return [];
        const ormEntities = await this.repo.findBy({ id: In(ids) });
        return ormEntities.map(e => this.mapToDomain(e));
    }

    async findAllActive(): Promise<Assignment[]> {
        const ormEntities = await this.repo.find({
            where: { status: In(['ACCEPTED', 'PENDING_ACCEPTANCE', 'PENDING_RETURN']) }
        });
        return ormEntities.map(e => this.mapToDomain(e));
    }

    async findActiveByAssetId(assetId: string): Promise<Assignment | null> {
        const ormEntity = await this.repo.findOne({ where: { asset_id: assetId, status: 'ACCEPTED' } });
        return ormEntity ? this.mapToDomain(ormEntity) : null;
    }

    async findCurrentByAssetId(assetId: string): Promise<Assignment | null> {
        const ormEntity = await this.repo.createQueryBuilder('assignment')
            .where('assignment.asset_id = :assetId', { assetId })
            .andWhere('assignment.status IN (:...statuses)', { statuses: ['PENDING_ACCEPTANCE', 'ACCEPTED', 'PENDING_RETURN'] })
            .getOne();

        return ormEntity ? this.mapToDomain(ormEntity) : null;
    }

    async findLoansDueWithinDays(days: number): Promise<Assignment[]> {
        const limit = new Date();
        limit.setDate(limit.getDate() + days);

        const ormEntities = await this.repo.createQueryBuilder('assignment')
            .where('assignment.assignment_type = :type', { type: 'LOAN' })
            .andWhere('assignment.status = :status', { status: 'ACCEPTED' })
            .andWhere('assignment.expected_return_date <= :limit', { limit })
            .getMany();

        return ormEntities.map(e => this.mapToDomain(e));
    }

    private mapToDomain(ormEntity: AssignmentOrmEntity): Assignment {
        return new Assignment({
            id: ormEntity.id,
            assetId: ormEntity.asset_id,
            collaboratorId: ormEntity.collaborator_id,
            status: ormEntity.status as AssignmentStatus,
            assignmentType: (ormEntity.assignment_type || 'PERMANENT') as AssignmentType,
            startDate: ormEntity.start_date,
            endDate: ormEntity.end_date,
            expectedReturnDate: ormEntity.expected_return_date,
            lastAlertSentAt: ormEntity.last_alert_sent_at,
            signatureToken: ormEntity.signature_token,
            signatureMetadata: ormEntity.signature_metadata,
            documentPath: ormEntity.document_path,
            adminApproval: ormEntity.admin_approval
        });
    }
}
