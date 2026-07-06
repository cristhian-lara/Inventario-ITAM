import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CategoryOrmEntity } from './Category.entity';

@Entity('assets', { schema: 'public' })
export class AssetOrmEntity {
    @PrimaryColumn()
    id!: string;

    @Column({ nullable: true })
    category_id!: number;

    @Column({ nullable: true })
    serial?: string;

    @Column()
    status!: string;

    @Column({ type: 'jsonb' })
    dynamic_data: any;

    @Column({ type: 'date', nullable: true })
    purchase_date?: Date;

    @Column({ type: 'int', nullable: true })
    warranty_months?: number;

    @Column({ type: 'int', nullable: true })
    depreciation_years?: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    purchase_price?: number;

    /** Datos de la baja: { reason, disposalDate, authorizedBy, blanccoReportId, notes } */
    @Column({ type: 'jsonb', nullable: true })
    disposal?: any;

    @ManyToOne(() => CategoryOrmEntity)
    @JoinColumn({ name: 'category_id' })
    category!: CategoryOrmEntity;
}
