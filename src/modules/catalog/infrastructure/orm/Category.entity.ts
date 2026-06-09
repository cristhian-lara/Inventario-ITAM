import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('categories', { schema: 'public' })
export class CategoryOrmEntity {
    @PrimaryColumn()
    id!: string;

    @Column()
    name!: string;

    @Column({ type: 'jsonb' })
    attributes_schema: any;
}
