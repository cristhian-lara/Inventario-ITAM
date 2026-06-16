import { Repository } from 'typeorm';
import { AppDataSource } from '../../../shared/infrastructure/database/postgres';
import { CustomList, CustomListItem } from '../domain/CustomList';
import { CustomListOrmEntity } from './orm/CustomList.entity';
import { CustomListItemOrmEntity } from './orm/CustomListItem.entity';

export class PostgresCustomListRepository {
    private listRepo: Repository<CustomListOrmEntity>;
    private itemRepo: Repository<CustomListItemOrmEntity>;

    constructor() {
        this.listRepo = AppDataSource.getRepository(CustomListOrmEntity);
        this.itemRepo = AppDataSource.getRepository(CustomListItemOrmEntity);
    }

    private mapToDomain(ormEntity: CustomListOrmEntity): CustomList {
        const items = ormEntity.items 
            ? ormEntity.items.map(i => new CustomListItem(
                i.id, i.listId, i.value, i.description, i.orderIndex, i.isActive
            )).sort((a, b) => a.orderIndex - b.orderIndex)
            : [];
            
        return new CustomList(
            ormEntity.id,
            ormEntity.name,
            ormEntity.description,
            ormEntity.code,
            ormEntity.isSystem,
            items,
            ormEntity.targetEntity as 'Collaborator' | 'Asset' | 'None'
        );
    }

    async findAll(): Promise<CustomList[]> {
        const lists = await this.listRepo.find({ relations: { items: true }, order: { name: 'ASC' } });
        return lists.map(l => this.mapToDomain(l));
    }

    async findById(id: string): Promise<CustomList | null> {
        const list = await this.listRepo.findOne({ where: { id }, relations: { items: true } });
        return list ? this.mapToDomain(list) : null;
    }

    async findByCode(code: string): Promise<CustomList | null> {
        const list = await this.listRepo.findOne({ where: { code }, relations: { items: true } });
        return list ? this.mapToDomain(list) : null;
    }

    async saveList(list: CustomList): Promise<CustomList> {
        const ormEntity = this.listRepo.create({
            id: list.id,
            name: list.name,
            description: list.description || undefined,
            code: list.code,
            isSystem: list.isSystem,
            targetEntity: list.targetEntity
        });
        await this.listRepo.save(ormEntity);
        return this.findById(list.id) as Promise<CustomList>;
    }

    async deleteList(id: string): Promise<void> {
        await this.listRepo.delete(id);
    }

    async saveItem(item: CustomListItem): Promise<void> {
        const ormEntity = this.itemRepo.create({
            id: item.id,
            listId: item.listId,
            value: item.value,
            description: item.description || undefined,
            orderIndex: item.orderIndex,
            isActive: item.isActive
        });
        await this.itemRepo.save(ormEntity);
    }

    async deleteItem(id: string): Promise<void> {
        await this.itemRepo.delete(id);
    }
}
