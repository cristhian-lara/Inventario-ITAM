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
            // 401 (no autenticado): el interceptor del frontend detecta este código
            // y redirige al login. 403 se reserva para usuarios autenticados sin permisos.
            res.status(401).json({ error: 'Sesión inválida o expirada. Inicia sesión de nuevo.' });
        }
    } else {
        res.status(401).json({ error: 'Falta el token de autorización' });
    }
};
