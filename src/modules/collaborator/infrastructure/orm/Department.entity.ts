import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('departments')
export class DepartmentOrmEntity {
    @PrimaryGeneratedColumn('increment')
    id!: number;

    @Column()
    name!: string;

    @Column({ nullable: true })
    description!: string;

    @CreateDateColumn({ name: 'created_at' })
    created_at!: Date;
}
