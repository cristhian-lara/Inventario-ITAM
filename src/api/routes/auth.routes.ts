import { Router } from 'express';
import { AuthController } from '../../modules/auth/infrastructure/controllers/AuthController';
import { LoginUseCase } from '../../modules/auth/application/LoginUseCase';
import { PostgresUserRepository } from '../../modules/auth/infrastructure/repositories/PostgresUserRepository';
import { BcryptPasswordHasher } from '../../modules/auth/infrastructure/services/BcryptPasswordHasher';
import { JwtTokenService } from '../../modules/auth/infrastructure/services/JwtTokenService';

const authRouter = Router();

// Dependencias
const userRepository = new PostgresUserRepository();
const passwordHasher = new BcryptPasswordHasher();
const tokenService = new JwtTokenService();

const loginUseCase = new LoginUseCase(userRepository, passwordHasher, tokenService);
const authController = new AuthController(loginUseCase);

authRouter.post('/login', (req, res) => authController.login(req, res));

export default authRouter;
