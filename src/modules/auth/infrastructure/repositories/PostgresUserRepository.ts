import { Repository } from 'typeorm';
import { AppDataSource } from '../../../../shared/infrastructure/database/postgres';
import { UserEntity } from '../orm/User.entity';
import { User } from '../../domain/User';
import { IUserRepository } from '../../domain/IUserRepository';
import { Role } from '../../domain/Role';

export class PostgresUserRepository implements IUserRepository {
    private repository: Repository<UserEntity>;

    constructor() {
        this.repository = AppDataSource.getRepository(UserEntity);
    }

    async findByUsername(username: string): Promise<User | null> {
        const entity = await this.repository.findOne({ where: { username } });
        if (!entity) return null;
        return this.toDomain(entity);
    }

    async save(user: User): Promise<User> {
        const entity = this.repository.create({
            id: user.id,
            username: user.username,
            passwordHash: user.passwordHash,
            role: user.role,
        });
        const saved = await this.repository.save(entity);
        return this.toDomain(saved);
    }

    private toDomain(entity: UserEntity): User {
        return new User(
            entity.id,
            entity.username,
            entity.passwordHash,
            entity.role,
            entity.createdAt,
            entity.updatedAt
        );
    }
}
