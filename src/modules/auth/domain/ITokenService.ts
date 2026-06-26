import { User } from './User';

export interface ITokenService {
    generateToken(user: User): string;
    verifyToken(token: string): any;
}
