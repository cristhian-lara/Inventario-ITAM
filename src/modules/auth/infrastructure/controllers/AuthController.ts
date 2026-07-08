import { Request, Response } from 'express';
import { LoginUseCase } from '../../application/LoginUseCase';
import { UserManagementUseCases, UserManagementError } from '../../application/UserManagementUseCases';
import { buildPermissionsMap } from '../../application/buildPermissionsMap';
import { IUserRepository } from '../../domain/IUserRepository';
import { IPermissionRepository } from '../../domain/IPermissionRepository';
import { AuthRequest } from '../../../../api/middlewares/auth.middleware';

export class AuthController {
    constructor(
        private loginUseCase: LoginUseCase,
        private userManagement: UserManagementUseCases,
        private userRepository: IUserRepository,
        private permissionRepository: IPermissionRepository
    ) {}

    async login(req: Request, res: Response): Promise<void> {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                res.status(400).json({ error: 'Username y password son requeridos' });
                return;
            }

            const result = await this.loginUseCase.execute({ username, password });
            res.status(200).json(result);
        } catch (error: any) {
            if (error.message === 'Credenciales inválidas') {
                res.status(401).json({ error: error.message });
            } else if (error.message === 'Cuenta inactiva') {
                res.status(401).json({ error: 'Tu cuenta está desactivada. Contacta al administrador.' });
            } else {
                console.error('Error in login:', error);
                res.status(500).json({ error: 'Error interno del servidor' });
            }
        }
    }

    /** Usuario autenticado + permisos frescos desde BD (el guard ya validó que está activo). */
    async me(req: AuthRequest, res: Response): Promise<void> {
        try {
            const user = await this.userRepository.findById(req.user.id);
            if (!user) {
                res.status(401).json({ error: 'Usuario no encontrado' });
                return;
            }
            const permissions = await buildPermissionsMap(user, this.permissionRepository);
            res.json({
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                role: user.role,
                permissions
            });
        } catch (error) {
            console.error('Error in /auth/me:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    async changePassword(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { currentPassword, newPassword } = req.body;
            await this.userManagement.changeOwnPassword(req.user.id, currentPassword, newPassword);
            res.json({ message: 'Contraseña actualizada correctamente' });
        } catch (error: any) {
            if (error instanceof UserManagementError) {
                res.status(error.status).json({ error: error.message });
                return;
            }
            console.error('Error in change-password:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
}
