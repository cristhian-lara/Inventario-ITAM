import { Router } from 'express';
import { AuthController } from '../../modules/auth/infrastructure/controllers/AuthController';
import { LoginUseCase } from '../../modules/auth/application/LoginUseCase';
import { PostgresUserRepository } from '../../modules/auth/infrastructure/repositories/PostgresUserRepository';
import { BcryptPasswordHasher } from '../../modules/auth/infrastructure/services/BcryptPasswordHasher';
import { JwtTokenService } from '../../modules/auth/infrastructure/services/JwtTokenService';
import { PostgresPermissionRepository } from '../../modules/auth/infrastructure/repositories/PostgresPermissionRepository';
import { UserManagementUseCases } from '../../modules/auth/application/UserManagementUseCases';
import { createRateLimiter } from '../middlewares/rateLimit.middleware';

const authRouter = Router();

// Máx. 5 intentos de login por IP por minuto. Mitiga fuerza bruta de credenciales.
const loginRateLimit = createRateLimiter({
    windowMs: 60_000,
    max: 5,
    keyPrefix: 'login',
    message: 'Demasiados intentos de inicio de sesión. Espera un minuto e intenta de nuevo.'
});

// Dependencias
const userRepository = new PostgresUserRepository();
const passwordHasher = new BcryptPasswordHasher();
const tokenService = new JwtTokenService();
const permissionRepository = new PostgresPermissionRepository();

const loginUseCase = new LoginUseCase(userRepository, passwordHasher, tokenService, permissionRepository);
const userManagement = new UserManagementUseCases(userRepository, permissionRepository, passwordHasher);
const authController = new AuthController(loginUseCase, userManagement, userRepository, permissionRepository);

authRouter.post('/login', loginRateLimit, (req, res) => authController.login(req, res));
// El apiGuard exige sesión activa para estos (entradas authOnly del mapa de permisos)
authRouter.get('/me', (req, res) => authController.me(req as any, res));
authRouter.post('/change-password', (req, res) => authController.changePassword(req as any, res));
authRouter.post('/logout', (req, res) => authController.logout(req as any, res));

export default authRouter;
