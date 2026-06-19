import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('maintenances', { schema: 'public' })
export class MaintenanceOrmEntity {
    @PrimaryColumn()
    id!: string;

    @Column()
    asset_id!: string;

    @Column()
    type!: string; // PREVENTIVE, CORRECTIVE

    @Column()
    status!: string; // SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED

    @Column({ type: 'date' })
    scheduled_date!: Date;

    @Column({ type: 'date', nullable: true })
    execution_date?: Date;

    @Column({ nullable: true })
    reason?: string;

    @Column({ type: 'text', nullable: true })
    start_note?: string;

    @Column({ type: 'text', nullable: true })
    notes?: string;

    @Column({ nullable: true })
    collaborator_snapshot_id?: string;

    @Column({ nullable: true })
    collaborator_snapshot_name?: string;

    @Column({ nullable: true })
    signature_token?: string;

    @Column({ type: 'jsonb', nullable: true })
    signature_metadata?: any;

    @Column({ type: 'timestamp', nullable: true })
    signed_at?: Date;

    @Column({ nullable: true })
    pdf_url?: string;

    @CreateDateColumn()
    created_at!: Date;
}
