import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { CustomListItemOrmEntity } from './CustomListItem.entity';

@Entity('custom_lists')
export class CustomListOrmEntity {
    @PrimaryColumn('uuid')
    id!: string;

    @Column()
    name!: string;

    @Column({ nullable: true })
    description!: string;

    @Column({ unique: true })
    code!: string;

    @Column({ default: false })
    isSystem!: boolean;

    @OneToMany(() => CustomListItemOrmEntity, item => item.list, { cascade: true, eager: true })
    items!: CustomListItemOrmEntity[];

    @Column({ default: 'None' })
    targetEntity!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
