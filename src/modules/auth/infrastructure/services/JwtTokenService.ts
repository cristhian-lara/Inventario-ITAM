import jwt from 'jsonwebtoken';
import { ITokenService } from '../../domain/ITokenService';
import { User } from '../../domain/User';
import * as dotenv from 'dotenv';

dotenv.config();

export class JwtTokenService implements ITokenService {
    private readonly secret: string;

    constructor() {
        this.secret = process.env.JWT_SECRET || 'super-secret-default-key';
    }

    generateToken(user: User): string {
        const payload = {
            id: user.id,
            username: user.username,
            role: user.role
        };
        // 8 horas de expiración
        return jwt.sign(payload, this.secret, { expiresIn: '8h' });
    }

    verifyToken(token: string): any {
        return jwt.verify(token, this.secret);
    }
}
