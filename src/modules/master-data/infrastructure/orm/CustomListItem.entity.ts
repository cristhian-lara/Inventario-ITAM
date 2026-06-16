import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { CustomListOrmEntity } from './CustomList.entity';

@Entity('custom_list_items')
export class CustomListItemOrmEntity {
    @PrimaryColumn('uuid')
    id!: string;

    @Column('uuid')
    listId!: string;

    @Column()
    value!: string;

    @Column({ nullable: true })
    description!: string;

    @Column({ default: 0 })
    orderIndex!: number;

    @Column({ default: true })
    isActive!: boolean;

    @ManyToOne(() => CustomListOrmEntity, list => list.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'listId' })
    list!: CustomListOrmEntity;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
