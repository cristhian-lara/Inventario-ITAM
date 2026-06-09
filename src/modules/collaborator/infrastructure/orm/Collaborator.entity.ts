import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('collaborators')
export class CollaboratorOrmEntity {
    @PrimaryColumn()
    id!: string;

    @Column()
    name!: string;

    @Column({ unique: true })
    email!: string;

    @Column()
    department!: string;

    @Column()
    location!: string;

    @Column({ default: 'ACTIVE' })
    status!: string;

    @Column({ type: 'timestamp' })
    activation_date!: Date;

    @Column({ type: 'timestamp', nullable: true })
    deactivation_date!: Date;

    @CreateDateColumn()
    created_at!: Date;

    @Column({ default: false })
    is_leader!: boolean;

    @Column({ nullable: true })
    leader_id!: string;

    @Column({ type: 'jsonb', default: '{}' })
    dynamic_attributes!: any;
}
