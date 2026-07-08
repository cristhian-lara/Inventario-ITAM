import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Check } from 'typeorm';
import { Role } from '../../domain/Role';

@Entity('users')
@Check('CHK_users_role', "role IN ('SUPER_ADMIN','ADMINISTRADOR','ESTANDAR')")
export class UserEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true })
    username!: string;

    @Column({ name: 'password_hash' })
    passwordHash!: string;

    // varchar + CHECK en lugar de enum de Postgres: permite evolucionar los
    // valores sin ALTER TYPE (frágil con synchronize:true)
    @Column({ type: 'varchar', length: 20, default: Role.ESTANDAR })
    role!: Role;

    @Column({ name: 'full_name', length: 150 })
    fullName!: string;

    @Column({ unique: true, length: 150 })
    email!: string;

    @Column({ name: 'is_active', default: true })
    isActive!: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}
