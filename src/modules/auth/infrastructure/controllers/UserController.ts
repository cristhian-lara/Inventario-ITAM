import { Response } from 'express';
import { UserManagementUseCases, UserManagementError } from '../../application/UserManagementUseCases';
import { AuthRequest } from '../../../../api/middlewares/auth.middleware';
import { Role } from '../../domain/Role';

export class UserController {
    constructor(private useCases: UserManagementUseCases) {}

    private actor(req: AuthRequest) {
        return { id: req.user.id as string, role: req.user.role as Role };
    }

    private targetId(req: AuthRequest): string {
        return String(req.params.id);
    }

    private handleError(res: Response, error: any, context: string): void {
        if (error instanceof UserManagementError) {
            res.status(error.status).json({ error: error.message });
            return;
        }
        console.error(`Error in ${context}:`, error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }

    async list(req: AuthRequest, res: Response): Promise<void> {
        try {
            res.json(await this.useCases.listUsers());
        } catch (error) {
            this.handleError(res, error, 'GET /users');
        }
    }

    async modules(req: AuthRequest, res: Response): Promise<void> {
        try {
            res.json(await this.useCases.listModules());
        } catch (error) {
            this.handleError(res, error, 'GET /users/modules');
        }
    }

    async permissions(req: AuthRequest, res: Response): Promise<void> {
        try {
            res.json(await this.useCases.getUserPermissions(this.targetId(req)));
        } catch (error) {
            this.handleError(res, error, 'GET /users/:id/permissions');
        }
    }

    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { username, password, fullName, email, role, isActive, permissions } = req.body;
            const user = await this.useCases.createUser(this.actor(req), {
                username, password, fullName, email, role, isActive, permissions
            });
            res.status(201).json(user);
        } catch (error) {
            this.handleError(res, error, 'POST /users');
        }
    }

    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { fullName, email, role } = req.body;
            const user = await this.useCases.updateUser(this.actor(req), this.targetId(req), { fullName, email, role });
            res.json(user);
        } catch (error) {
            this.handleError(res, error, 'PUT /users/:id');
        }
    }

    async setPermissions(req: AuthRequest, res: Response): Promise<void> {
        try {
            const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions : [];
            await this.useCases.setPermissions(this.actor(req), this.targetId(req), permissions);
            res.json({ message: 'Permisos actualizados correctamente' });
        } catch (error) {
            this.handleError(res, error, 'PUT /users/:id/permissions');
        }
    }

    async setStatus(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { isActive } = req.body;
            const user = await this.useCases.setStatus(this.actor(req), this.targetId(req), !!isActive);
            res.json(user);
        } catch (error) {
            this.handleError(res, error, 'PATCH /users/:id/status');
        }
    }

    async resetPassword(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { newPassword } = req.body;
            await this.useCases.resetPassword(this.actor(req), this.targetId(req), newPassword);
            res.json({ message: 'Contraseña restablecida correctamente' });
        } catch (error) {
            this.handleError(res, error, 'POST /users/:id/reset-password');
        }
    }

    async remove(req: AuthRequest, res: Response): Promise<void> {
        try {
            await this.useCases.deleteUser(this.actor(req), this.targetId(req));
            res.json({ message: 'Usuario eliminado correctamente' });
        } catch (error) {
            this.handleError(res, error, 'DELETE /users/:id');
        }
    }
}
