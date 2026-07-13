import { User } from './User';

export interface IUserRepository {
    findByUsername(username: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findAll(): Promise<User[]>;
    save(user: User): Promise<User>;
    create(data: {
        username: string;
        passwordHash: string;
        role: string;
        fullName: string;
        email: string;
        isActive: boolean;
    }): Promise<User>;
    delete(id: string): Promise<void>;
    /** Invalida todos los JWT emitidos previamente para este usuario (logout, cambio de contraseña). */
    incrementTokenVersion(id: string): Promise<void>;
}
