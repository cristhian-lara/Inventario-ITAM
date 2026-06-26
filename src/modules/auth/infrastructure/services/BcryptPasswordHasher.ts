import bcrypt from 'bcrypt';
import { IPasswordHasher } from '../../domain/IPasswordHasher';

export class BcryptPasswordHasher implements IPasswordHasher {
    private readonly saltRounds = 10;

    async hash(password: string): Promise<string> {
        return bcrypt.hash(password, this.saltRounds);
    }

    async compare(plain: string, hash: string): Promise<boolean> {
        return bcrypt.compare(plain, hash);
    }
}
