import { IUserRepository } from '../domain/IUserRepository';
import { IPasswordHasher } from '../domain/IPasswordHasher';
import { ITokenService } from '../domain/ITokenService';
import { IPermissionRepository } from '../domain/IPermissionRepository';
import { LoginDTO } from './dtos/LoginDTO';
import { Role } from '../domain/Role';
import { buildPermissionsMap, PermissionsMap } from './buildPermissionsMap';

export interface LoginResult {
    token: string;
    user: {
        id: string;
        username: string;
        fullName: string;
        role: Role;
        permissions: PermissionsMap;
    };
}

export class LoginUseCase {
    constructor(
        private userRepository: IUserRepository,
        private passwordHasher: IPasswordHasher,
        private tokenService: ITokenService,
        private permissionRepository: IPermissionRepository
    ) {}

    async execute(dto: LoginDTO): Promise<LoginResult> {
        const user = await this.userRepository.findByUsername(dto.username);
        if (!user) {
            throw new Error('Credenciales inválidas');
        }

        const isPasswordValid = await this.passwordHasher.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new Error('Credenciales inválidas');
        }

        if (!user.isActive) {
            throw new Error('Cuenta inactiva');
        }

        const token = this.tokenService.generateToken(user);
        const permissions = await buildPermissionsMap(user, this.permissionRepository);

        return {
            token,
            user: {
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                role: user.role,
                permissions
            }
        };
    }
}
