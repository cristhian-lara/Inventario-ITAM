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

    async findById(id: string): Promise<User | null> {
        const entity = await this.repository.findOne({ where: { id } });
        if (!entity) return null;
        return this.toDomain(entity);
    }

    async findByEmail(email: string): Promise<User | null> {
        const entity = await this.repository.findOne({ where: { email } });
        if (!entity) return null;
        return this.toDomain(entity);
    }

    async findAll(): Promise<User[]> {
        const entities = await this.repository.find({ order: { createdAt: 'ASC' } });
        return entities.map(e => this.toDomain(e));
    }

    async save(user: User): Promise<User> {
        const entity = this.repository.create({
            id: user.id,
            username: user.username,
            passwordHash: user.passwordHash,
            role: user.role,
            fullName: user.fullName,
            email: user.email,
            isActive: user.isActive,
        });
        const saved = await this.repository.save(entity);
        return this.toDomain(saved);
    }

    async create(data: {
        username: string;
        passwordHash: string;
        role: string;
        fullName: string;
        email: string;
        isActive: boolean;
    }): Promise<User> {
        const entity = this.repository.create({
            username: data.username,
            passwordHash: data.passwordHash,
            role: data.role as Role,
            fullName: data.fullName,
            email: data.email,
            isActive: data.isActive,
        });
        const saved = await this.repository.save(entity);
        return this.toDomain(saved);
    }

    async delete(id: string): Promise<void> {
        await this.repository.delete(id);
    }

    private toDomain(entity: UserEntity): User {
        return new User(
            entity.id,
            entity.username,
            entity.passwordHash,
            entity.role,
            entity.fullName,
            entity.email,
            entity.isActive,
            entity.createdAt,
            entity.updatedAt
        );
    }
}
