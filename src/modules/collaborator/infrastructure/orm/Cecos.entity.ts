import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('cecos')
export class CecosEntity {
    @PrimaryColumn()
    id!: string;

    @Column()
    name!: string;

    @Column({ nullable: true })
    description!: string;
}
