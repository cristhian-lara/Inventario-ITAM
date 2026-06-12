import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('categories', { schema: 'public' })
export class CategoryOrmEntity {
    @PrimaryGeneratedColumn('increment')
    id!: number;

    @Column()
    name!: string;

    @Column({ type: 'jsonb' })
    attributes_schema: any;
}
