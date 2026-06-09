import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('collaborator_history')
export class CollaboratorHistoryOrmEntity {
    @PrimaryColumn()
    id!: string;

    @Column()
    collaborator_id!: string;

    @Column()
    action!: string;

    @CreateDateColumn()
    timestamp!: Date;

    @Column({ nullable: true })
    reason!: string;
}
