import { v4 as uuidv4 } from 'uuid';
import { PostgresCustomListRepository } from '../infrastructure/PostgresCustomListRepository';
import { CustomList, CustomListItem } from '../domain/CustomList';

export class CustomListUseCases {
    constructor(private repo: PostgresCustomListRepository) {}

    async getAllLists(): Promise<CustomList[]> {
        return this.repo.findAll();
    }

    async getListByCode(code: string): Promise<CustomList | null> {
        return this.repo.findByCode(code);
    }

    async createList(name: string, description?: string, isSystem: boolean = false, targetEntity: 'Collaborator' | 'Asset' | 'None' = 'None'): Promise<CustomList> {
        const id = uuidv4();
        const code = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '_');
        
        // Prevent duplicate codes by adding a small suffix if it exists
        let finalCode = code;
        let counter = 1;
        while(await this.repo.findByCode(finalCode)) {
            finalCode = `${code}_${counter}`;
            counter++;
        }

        const newList = new CustomList(id, name, description || null, finalCode, isSystem, [], targetEntity);
        return this.repo.saveList(newList);
    }

    async updateList(id: string, name: string, description?: string, targetEntity?: 'Collaborator' | 'Asset' | 'None'): Promise<CustomList> {
        const list = await this.repo.findById(id);
        if (!list) throw new Error('List not found');
        
        list.name = name;
        list.description = description || null;
        if (targetEntity) list.targetEntity = targetEntity;
        return this.repo.saveList(list);
    }

    async deleteList(id: string): Promise<void> {
        const list = await this.repo.findById(id);
        if (!list) throw new Error('List not found');
        if (list.isSystem) throw new Error('Cannot delete system list');
        await this.repo.deleteList(id);
    }

    async addItem(listId: string, value: string, description?: string, orderIndex?: number): Promise<CustomListItem> {
        const list = await this.repo.findById(listId);
        if (!list) throw new Error('List not found');

        const nextOrder = orderIndex !== undefined ? orderIndex : (list.items.length > 0 ? Math.max(...list.items.map(i => i.orderIndex)) + 1 : 0);
        const item = new CustomListItem(uuidv4(), listId, value, description || null, nextOrder, true);
        await this.repo.saveItem(item);
        return item;
    }

    async updateItem(itemId: string, listId: string, value: string, description?: string, orderIndex?: number, isActive?: boolean): Promise<void> {
        const list = await this.repo.findById(listId);
        if (!list) throw new Error('List not found');
        
        const item = list.items.find(i => i.id === itemId);
        if (!item) throw new Error('Item not found');

        item.value = value;
        if (description !== undefined) item.description = description;
        if (orderIndex !== undefined) item.orderIndex = orderIndex;
        if (isActive !== undefined) item.isActive = isActive;

        await this.repo.saveItem(item);
    }

    async deleteItem(itemId: string): Promise<void> {
        await this.repo.deleteItem(itemId);
    }
}
