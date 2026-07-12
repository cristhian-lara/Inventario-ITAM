import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('assignments', { schema: 'public' })
export class AssignmentOrmEntity {
    @PrimaryColumn()
    id!: string;

    @Column()
    asset_id!: string;

    @Column()
    collaborator_id!: string;

    @Column()
    status!: string;

    @Column({ default: 'PERMANENT' })
    assignment_type!: string;

    @Column({ type: 'timestamp' })
    start_date!: Date;

    @Column({ type: 'timestamp', nullable: true })
    end_date?: Date;

    @Column({ type: 'timestamp', nullable: true })
    expected_return_date?: Date;

    @Column({ type: 'timestamp', nullable: true })
    last_alert_sent_at?: Date;

    @Column({ nullable: true })
    signature_token?: string;

    @Column({ type: 'jsonb', nullable: true })
    signature_metadata?: any;

    @Column({ nullable: true })
    document_path?: string;

    /** Visto bueno del administrador tras la devolución: { approvedBy, approvedAt, note } */
    @Column({ type: 'jsonb', nullable: true })
    admin_approval?: any;
}
