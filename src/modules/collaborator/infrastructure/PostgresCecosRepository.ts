import { Repository } from 'typeorm';
import { Cecos } from '../domain/Cecos';
import { ICecosRepository } from '../domain/ICecosRepository';
import { CecosEntity } from './orm/Cecos.entity';
import { AppDataSource } from '../../../shared/infrastructure/database/postgres';

export class PostgresCecosRepository implements ICecosRepository {
    private get repository(): Repository<CecosEntity> {
        return AppDataSource.getRepository(CecosEntity);
    }

    async save(cecos: Cecos): Promise<void> {
        const entity = this.repository.create({
            id: cecos.id,
            name: cecos.name,
            description: cecos.description
        });
        await this.repository.save(entity);
    }

    async findById(id: string): Promise<Cecos | null> {
        const entity = await this.repository.findOneBy({ id });
        if (!entity) return null;
        return new Cecos(entity.id, entity.name, entity.description);
    }

    async findAll(): Promise<Cecos[]> {
        const entities = await this.repository.find();
        return entities.map(e => new Cecos(e.id, e.name, e.description));
    }

    async delete(id: string): Promise<void> {
        await this.repository.delete(id);
    }
}
