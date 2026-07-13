import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('maintenances', { schema: 'public' })
export class MaintenanceOrmEntity {
    @PrimaryColumn()
    id!: string;

    @Index()
    @Column()
    asset_id!: string;

    @Column()
    type!: string; // PREVENTIVE, CORRECTIVE

    @Index()
    @Column()
    status!: string; // SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED

    @Column({ type: 'date' })
    scheduled_date!: Date;

    /** Fecha y hora exacta en que el mantenimiento pasó a En Progreso */
    @Column({ type: 'timestamp', nullable: true })
    started_at?: Date;

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

    /** Última vez que se notificó por Webex el vencimiento próximo de este mantenimiento (job diario) */
    @Column({ type: 'timestamp', nullable: true })
    last_alert_sent_at?: Date;

    @CreateDateColumn()
    created_at!: Date;
}
