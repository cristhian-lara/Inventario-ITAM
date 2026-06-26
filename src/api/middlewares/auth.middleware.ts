import { Request, Response, NextFunction } from 'express';
import { JwtTokenService } from '../../modules/auth/infrastructure/services/JwtTokenService';

const tokenService = new JwtTokenService();

export interface AuthRequest extends Request {
    user?: any;
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        try {
            const user = tokenService.verifyToken(token);
            req.user = user;
            next();
        } catch (err) {
            res.status(403).json({ error: 'Token inválido o expirado' });
        }
    } else {
        res.status(401).json({ error: 'Falta el token de autorización' });
    }
};
