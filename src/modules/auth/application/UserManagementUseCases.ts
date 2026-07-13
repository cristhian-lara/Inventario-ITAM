import { IUserRepository } from '../domain/IUserRepository';
import { IPermissionRepository } from '../domain/IPermissionRepository';
import { IPasswordHasher } from '../domain/IPasswordHasher';
import { PasswordPolicy } from '../domain/PasswordPolicy';
import { Role } from '../domain/Role';
import { User } from '../domain/User';
import { UserPermission } from '../domain/UserPermission';

export interface ActorContext {
    id: string;
    role: Role;
}

export interface PermissionInput {
    moduleKey: string;
    canRead: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
}

export interface UserSummary {
    id: string;
    username: string;
    fullName: string;
    email: string;
    role: Role;
    isActive: boolean;
    createdAt: Date;
}

/** Error de negocio: el controlador lo traduce a HTTP 400/403. */
export class UserManagementError extends Error {
    constructor(message: string, public readonly status: number = 400) {
        super(message);
    }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class UserManagementUseCases {
    constructor(
        private userRepository: IUserRepository,
        private permissionRepository: IPermissionRepository,
        private passwordHasher: IPasswordHasher
    ) {}

    async listUsers(): Promise<UserSummary[]> {
        const users = await this.userRepository.findAll();
        return users.map(u => this.toSummary(u));
    }

    async listModules() {
        return this.permissionRepository.findActiveModules();
    }

    async getUserPermissions(userId: string): Promise<UserPermission[]> {
        return this.permissionRepository.findByUser(userId);
    }

    async createUser(actor: ActorContext, data: {
        username: string; password: string; fullName: string; email: string;
        role: Role; isActive?: boolean; permissions?: PermissionInput[];
    }): Promise<UserSummary> {
        this.validateRequired(data.username, 'usuario');
        this.validateRequired(data.fullName, 'nombre completo');
        this.validateEmail(data.email);
        this.validatePassword(data.password);
        this.validateAssignableRole(actor, data.role);

        await this.ensureUniqueUsername(data.username);
        await this.ensureUniqueEmail(data.email);

        const passwordHash = await this.passwordHasher.hash(data.password);
        const created = await this.userRepository.create({
            username: data.username.trim(),
            passwordHash,
            role: data.role,
            fullName: data.fullName.trim(),
            email: data.email.trim().toLowerCase(),
            isActive: data.isActive !== false,
        });

        if (data.permissions) {
            await this.permissionRepository.replaceForUser(created.id, this.toDomainPermissions(created.id, created.role, data.permissions));
        }
        return this.toSummary(created);
    }

    async updateUser(actor: ActorContext, userId: string, data: {
        fullName?: string; email?: string; role?: Role;
    }): Promise<UserSummary> {
        const user = await this.findTargetOrFail(userId);
        this.ensureCanModifyTarget(actor, user, 'editar');
        if (actor.id === userId) {
            throw new UserManagementError('No puedes editar tu propio usuario.', 403);
        }

        if (data.fullName !== undefined) {
            this.validateRequired(data.fullName, 'nombre completo');
            user.fullName = data.fullName.trim();
        }
        if (data.email !== undefined) {
            this.validateEmail(data.email);
            const normalized = data.email.trim().toLowerCase();
            if (normalized !== user.email) {
                await this.ensureUniqueEmail(normalized);
                user.email = normalized;
            }
        }
        let roleChangedToAuditor = false;
        if (data.role !== undefined && data.role !== user.role) {
            if (user.role === Role.SUPER_ADMIN) {
                throw new UserManagementError('El Super Administrador no puede ser degradado.', 403);
            }
            this.validateAssignableRole(actor, data.role);
            roleChangedToAuditor = data.role === Role.ESTANDAR;
            user.role = data.role;
        }

        const saved = await this.userRepository.save(user);

        // Al pasar a Auditor (solo consulta) se recortan los permisos de escritura existentes
        if (roleChangedToAuditor) {
            const current = await this.permissionRepository.findByUser(userId);
            await this.permissionRepository.replaceForUser(userId, this.toDomainPermissions(
                userId, Role.ESTANDAR,
                current.map(p => ({ moduleKey: p.moduleKey, canRead: p.canRead, canCreate: false, canEdit: false, canDelete: false }))
            ));
        }

        return this.toSummary(saved);
    }

    async setPermissions(actor: ActorContext, userId: string, permissions: PermissionInput[]): Promise<void> {
        const user = await this.findTargetOrFail(userId);
        if (user.role === Role.SUPER_ADMIN) {
            throw new UserManagementError('Los permisos del Super Administrador no se pueden modificar: siempre tiene acceso total.', 403);
        }
        // Anti-escalación: nadie (salvo el Super Admin) modifica su propia matriz
        if (actor.id === userId && actor.role !== Role.SUPER_ADMIN) {
            throw new UserManagementError('No puedes modificar tus propios permisos.', 403);
        }
        await this.permissionRepository.replaceForUser(userId, this.toDomainPermissions(userId, user.role, permissions));
    }

    async setStatus(actor: ActorContext, userId: string, isActive: boolean): Promise<UserSummary> {
        const user = await this.findTargetOrFail(userId);
        if (user.role === Role.SUPER_ADMIN) {
            throw new UserManagementError('El Super Administrador no se puede desactivar.', 403);
        }
        if (actor.id === userId && !isActive) {
            throw new UserManagementError('No puedes desactivar tu propia cuenta.', 403);
        }
        user.isActive = isActive;
        const saved = await this.userRepository.save(user);
        return this.toSummary(saved);
    }

    async deleteUser(actor: ActorContext, userId: string): Promise<void> {
        const user = await this.findTargetOrFail(userId);
        if (user.role === Role.SUPER_ADMIN) {
            throw new UserManagementError('El Super Administrador no se puede eliminar.', 403);
        }
        if (actor.id === userId) {
            throw new UserManagementError('No puedes eliminar tu propia cuenta.', 403);
        }
        await this.userRepository.delete(userId);
    }

    async resetPassword(actor: ActorContext, userId: string, newPassword: string): Promise<void> {
        const user = await this.findTargetOrFail(userId);
        // Solo el propio Super Admin puede restablecer su contraseña
        if (user.role === Role.SUPER_ADMIN && actor.role !== Role.SUPER_ADMIN) {
            throw new UserManagementError('No puedes restablecer la contraseña del Super Administrador.', 403);
        }
        this.validatePassword(newPassword);
        user.passwordHash = await this.passwordHasher.hash(newPassword);
        await this.userRepository.save(user);
    }

    async changeOwnPassword(actorId: string, currentPassword: string, newPassword: string): Promise<void> {
        const user = await this.userRepository.findById(actorId);
        if (!user) {
            throw new UserManagementError('Usuario no encontrado.', 404);
        }
        const currentOk = await this.passwordHasher.compare(currentPassword || '', user.passwordHash);
        if (!currentOk) {
            throw new UserManagementError('La contraseña actual es incorrecta.', 400);
        }
        this.validatePassword(newPassword);
        user.passwordHash = await this.passwordHasher.hash(newPassword);
        await this.userRepository.save(user);
    }

    // ── Reglas y validaciones ────────────────────────────────────────────────

    private async findTargetOrFail(userId: string): Promise<User> {
        const user = await this.userRepository.findById(userId);
        if (!user) throw new UserManagementError('Usuario no encontrado.', 404);
        return user;
    }

    /** Nadie modifica al Super Admin salvo él mismo (y solo sus datos, nunca rol/estado). */
    private ensureCanModifyTarget(actor: ActorContext, target: User, accion: string): void {
        if (target.role === Role.SUPER_ADMIN && actor.role !== Role.SUPER_ADMIN) {
            throw new UserManagementError(`No puedes ${accion} al Super Administrador.`, 403);
        }
    }

    /** Crear/promover a ADMINISTRADOR es exclusivo del Super Admin; nunca se crea otro SUPER_ADMIN. */
    private validateAssignableRole(actor: ActorContext, role: Role): void {
        if (!Object.values(Role).includes(role)) {
            throw new UserManagementError('Rol inválido.');
        }
        if (role === Role.SUPER_ADMIN) {
            throw new UserManagementError('No se puede asignar el rol Super Administrador: es único en el sistema.', 403);
        }
        if (role === Role.ADMINISTRADOR && actor.role !== Role.SUPER_ADMIN) {
            throw new UserManagementError('Solo el Super Administrador puede crear o asignar Administradores.', 403);
        }
    }

    private validateRequired(value: string, field: string): void {
        if (!value || !value.trim()) {
            throw new UserManagementError(`El campo ${field} es obligatorio.`);
        }
    }

    private validateEmail(email: string): void {
        if (!email || !EMAIL_REGEX.test(email.trim())) {
            throw new UserManagementError('El correo electrónico no es válido.');
        }
    }

    private validatePassword(password: string): void {
        const result = PasswordPolicy.validate(password);
        if (!result.valid) {
            throw new UserManagementError(result.error!);
        }
    }

    private async ensureUniqueUsername(username: string): Promise<void> {
        const existing = await this.userRepository.findByUsername(username.trim());
        if (existing) throw new UserManagementError('Ya existe un usuario con ese nombre de usuario.');
    }

    private async ensureUniqueEmail(email: string): Promise<void> {
        const existing = await this.userRepository.findByEmail(email.trim().toLowerCase());
        if (existing) throw new UserManagementError('Ya existe un usuario con ese correo electrónico.');
    }

    /**
     * El rol Auditor (ESTANDAR) es de solo consulta: cualquier flag de
     * escritura que llegue se descarta y solo se conserva la lectura.
     */
    private toDomainPermissions(userId: string, role: Role, inputs: PermissionInput[]): UserPermission[] {
        const readOnly = role === Role.ESTANDAR;
        return inputs.map(p => new UserPermission(
            userId,
            p.moduleKey,
            !!p.canRead,
            !readOnly && !!p.canCreate,
            !readOnly && !!p.canEdit,
            !readOnly && !!p.canDelete
        ));
    }

    private toSummary(user: User): UserSummary {
        return {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
        };
    }
}
