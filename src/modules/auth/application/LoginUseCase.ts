import { IUserRepository } from '../domain/IUserRepository';
import { IPasswordHasher } from '../domain/IPasswordHasher';
import { ITokenService } from '../domain/ITokenService';
import { LoginDTO } from './dtos/LoginDTO';
import { Role } from '../domain/Role';

export class LoginUseCase {
    constructor(
        private userRepository: IUserRepository,
        private passwordHasher: IPasswordHasher,
        private tokenService: ITokenService
    ) {}

    async execute(dto: LoginDTO): Promise<{ token: string, user: { id: string, username: string, role: Role } }> {
        const user = await this.userRepository.findByUsername(dto.username);
        if (!user) {
            throw new Error('Credenciales inválidas');
        }

        const isPasswordValid = await this.passwordHasher.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new Error('Credenciales inválidas');
        }

        const token = this.tokenService.generateToken(user);
        
        return {
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        };
    }
}
