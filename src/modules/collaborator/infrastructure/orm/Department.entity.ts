import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('departments')
export class DepartmentOrmEntity {
    @PrimaryColumn()
    id!: string;

    @Column()
    name!: string;

    @Column({ nullable: true })
    description!: string;

    @CreateDateColumn({ name: 'created_at' })
    created_at!: Date;
}
