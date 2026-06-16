import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('hardware_upgrades', { schema: 'public' })
export class HardwareUpgradeOrmEntity {
    @PrimaryColumn()
    id!: string;

    @Column()
    asset_id!: string;

    @Column({ type: 'date' })
    upgrade_date!: Date;

    @Column()
    component!: string; // RAM, Disco Duro, Procesador, Pantalla, Batería, etc.

    @Column({ nullable: true })
    old_value?: string;

    @Column()
    new_value!: string;

    @Column({ nullable: true })
    performed_by?: string; // Nombre del técnico que lo realizó

    @Column({ type: 'text', nullable: true })
    notes?: string;

    @CreateDateColumn()
    created_at!: Date;
}
