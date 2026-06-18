import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('settings')
export class SettingEntity {
    @PrimaryColumn()
    key!: string;

    @Column('text', { nullable: true })
    value!: string;
}
