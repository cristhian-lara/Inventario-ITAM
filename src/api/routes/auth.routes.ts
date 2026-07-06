import { Router } from 'express';
import { AuthController } from '../../modules/auth/infrastructure/controllers/AuthController';
import { LoginUseCase } from '../../modules/auth/application/LoginUseCase';
import { PostgresUserRepository } from '../../modules/auth/infrastructure/repositories/PostgresUserRepository';
import { BcryptPasswordHasher } from '../../modules/auth/infrastructure/services/BcryptPasswordHasher';
import { JwtTokenService } from '../../modules/auth/infrastructure/services/JwtTokenService';

const authRouter = Router();

// Rate limit simple en memoria para el login: máx. 5 intentos por IP por minuto.
// Mitiga fuerza bruta de credenciales sin dependencias externas.
const loginAttempts = new Map<string, { count: number; windowStart: number }>();
const LOGIN_WINDOW_MS = 60_000;
const LOGIN_MAX_ATTEMPTS = 5;

const loginRateLimit = (req: any, res: any, next: any) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = loginAttempts.get(ip);

    if (!entry || now - entry.windowStart > LOGIN_WINDOW_MS) {
        loginAttempts.set(ip, { count: 1, windowStart: now });
        return next();
    }
    entry.count++;
    if (entry.count > LOGIN_MAX_ATTEMPTS) {
        return res.status(429).json({ error: 'Demasiados intentos de inicio de sesión. Espera un minuto e intenta de nuevo.' });
    }
    next();
};

// Dependencias
const userRepository = new PostgresUserRepository();
const passwordHasher = new BcryptPasswordHasher();
const tokenService = new JwtTokenService();

const loginUseCase = new LoginUseCase(userRepository, passwordHasher, tokenService);
const authController = new AuthController(loginUseCase);

authRouter.post('/login', loginRateLimit, (req, res) => authController.login(req, res));

export default authRouter;
