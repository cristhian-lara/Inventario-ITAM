import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique, Check } from 'typeorm';
import { UserEntity } from './User.entity';
import { SystemModuleEntity } from './SystemModule.entity';

@Entity('user_permissions')
@Unique('UQ_user_permissions_user_module', ['userId', 'moduleId'])
// Regla acumulativa garantizada en BD: escritura implica lectura
@Check('CHK_user_permissions_read', '(NOT (can_create OR can_edit OR can_delete)) OR can_read')
export class UserPermissionEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId!: string;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: UserEntity;

    @Column({ name: 'module_id', type: 'uuid' })
    moduleId!: string;

    @ManyToOne(() => SystemModuleEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'module_id' })
    module!: SystemModuleEntity;

    @Column({ name: 'can_read', default: false })
    canRead!: boolean;

    @Column({ name: 'can_create', default: false })
    canCreate!: boolean;

    @Column({ name: 'can_edit', default: false })
    canEdit!: boolean;

    @Column({ name: 'can_delete', default: false })
    canDelete!: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}
