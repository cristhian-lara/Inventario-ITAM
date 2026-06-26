import { User } from './User';

export interface IUserRepository {
    findByUsername(username: string): Promise<User | null>;
    save(user: User): Promise<User>;
}
