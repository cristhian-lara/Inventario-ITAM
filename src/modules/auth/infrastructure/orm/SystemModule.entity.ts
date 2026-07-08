import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('system_modules')
export class SystemModuleEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true, length: 30 })
    key!: string;

    @Column({ length: 80 })
    name!: string;

    @Column({ name: 'display_order', type: 'int', default: 0 })
    displayOrder!: number;

    @Column({ name: 'is_active', default: true })
    isActive!: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}
