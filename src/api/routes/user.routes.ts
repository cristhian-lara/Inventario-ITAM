import { Router } from 'express';
import { UserController } from '../../modules/auth/infrastructure/controllers/UserController';
import { UserManagementUseCases } from '../../modules/auth/application/UserManagementUseCases';
import { PostgresUserRepository } from '../../modules/auth/infrastructure/repositories/PostgresUserRepository';
import { PostgresPermissionRepository } from '../../modules/auth/infrastructure/repositories/PostgresPermissionRepository';
import { BcryptPasswordHasher } from '../../modules/auth/infrastructure/services/BcryptPasswordHasher';

// La autorización (módulo "users" + reglas del Super Admin) la aplican el
// apiGuard global y los casos de uso; aquí solo se enrutan las peticiones.
const userRouter = Router();

const useCases = new UserManagementUseCases(
    new PostgresUserRepository(),
    new PostgresPermissionRepository(),
    new BcryptPasswordHasher()
);
const controller = new UserController(useCases);

userRouter.get('/modules', (req, res) => controller.modules(req as any, res));
userRouter.get('/:id/permissions', (req, res) => controller.permissions(req as any, res));
userRouter.get('/', (req, res) => controller.list(req as any, res));
userRouter.post('/', (req, res) => controller.create(req as any, res));
userRouter.put('/:id/permissions', (req, res) => controller.setPermissions(req as any, res));
userRouter.put('/:id', (req, res) => controller.update(req as any, res));
userRouter.patch('/:id/status', (req, res) => controller.setStatus(req as any, res));
userRouter.post('/:id/reset-password', (req, res) => controller.resetPassword(req as any, res));
userRouter.delete('/:id', (req, res) => controller.remove(req as any, res));

export default userRouter;
