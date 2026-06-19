import { DataSource, Repository, LessThan } from 'typeorm';
import { IMaintenanceRepository } from '../domain/IMaintenanceRepository';
import { MaintenanceRecord } from '../domain/MaintenanceRecord';
import { MaintenanceOrmEntity } from './orm/Maintenance.entity';
import { MaintenanceStatus, MaintenanceType } from '../domain/MaintenanceTypes';

export class PostgresMaintenanceRepository implements IMaintenanceRepository {
    private repo: Repository<MaintenanceOrmEntity>;

    constructor(dataSource: DataSource) {
        this.repo = dataSource.getRepository(MaintenanceOrmEntity);
    }

    private toDomain(orm: MaintenanceOrmEntity): MaintenanceRecord {
        const record = new MaintenanceRecord({
            id: orm.id,
            assetId: orm.asset_id,
            type: orm.type as MaintenanceType,
            status: orm.status as MaintenanceStatus,
            scheduledDate: orm.scheduled_date,
            executionDate: orm.execution_date || undefined,
            reason: orm.reason || undefined,
            startNote: orm.start_note || undefined,
            notes: orm.notes || undefined,
            collaboratorInTurnId: orm.collaborator_snapshot_id || undefined,
            collaboratorInTurnName: orm.collaborator_snapshot_name || undefined,
            signatureToken: orm.signature_token || undefined,
            signatureMetadata: orm.signature_metadata || undefined,
            signedAt: orm.signed_at || undefined,
            pdfUrl: orm.pdf_url || undefined
        });
        return record;
    }

    private toOrm(domain: MaintenanceRecord): MaintenanceOrmEntity {
        const orm = new MaintenanceOrmEntity();
        orm.id = domain.id;
        orm.asset_id = domain.assetId;
        orm.type = domain.type;
        orm.status = domain.status;
        orm.scheduled_date = domain.scheduledDate;
        orm.execution_date = domain.executionDate;
        orm.reason = domain.reason;
        orm.start_note = domain.startNote;
        orm.notes = domain.notes;
        orm.collaborator_snapshot_id = domain.collaboratorInTurnId;
        orm.collaborator_snapshot_name = domain.collaboratorInTurnName;
        // The properties getter will fail if we don't expose them or use any cast
        const props = (domain as any).props;
        orm.signature_token = props.signatureToken;
        orm.signature_metadata = props.signatureMetadata;
        orm.signed_at = props.signedAt;
        orm.pdf_url = props.pdfUrl;
        return orm;
    }

    async save(record: MaintenanceRecord): Promise<void> {
        await this.repo.save(this.toOrm(record));
    }

    async findById(id: string): Promise<MaintenanceRecord | null> {
        const orm = await this.repo.findOne({ where: { id } });
        return orm ? this.toDomain(orm) : null;
    }

    async findByAssetId(assetId: string): Promise<MaintenanceRecord[]> {
        const orms = await this.repo.find({ where: { asset_id: assetId }, order: { scheduled_date: 'DESC' } });
        return orms.map(o => this.toDomain(o));
    }

    async findAll(filters?: { status?: MaintenanceStatus; isExpired?: boolean; }): Promise<MaintenanceRecord[]> {
        const query: any = {};
        if (filters?.status && filters.status !== 'all' as any) {
            query.status = filters.status;
        }
        if (filters?.isExpired) {
            query.scheduled_date = LessThan(new Date());
            query.status = 'SCHEDULED';
        }
        const orms = await this.repo.find({ where: query, order: { scheduled_date: 'ASC' } });
        return orms.map(o => this.toDomain(o));
    }
}
