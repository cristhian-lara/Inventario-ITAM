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

    @Column({ type: 'timestamp' })
    start_date!: Date;

    @Column({ type: 'timestamp', nullable: true })
    end_date?: Date;

    @Column({ nullable: true })
    signature_token?: string;

    @Column({ type: 'jsonb', nullable: true })
    signature_metadata?: any;
}
