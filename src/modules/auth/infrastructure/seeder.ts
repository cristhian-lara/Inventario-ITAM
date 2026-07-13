import { AppDataSource, initializeDatabase } from '../../../shared/infrastructure/database/postgres';
import { UserEntity } from './orm/User.entity';
import { SystemModuleEntity } from './orm/SystemModule.entity';
import { Role } from '../domain/Role';
import { BcryptPasswordHasher } from './services/BcryptPasswordHasher';
import { seedSystemModules } from './systemModulesSeed';

const seed = async () => {
    try {
        await initializeDatabase();
        const userRepository = AppDataSource.getRepository(UserEntity);
        const moduleRepository = AppDataSource.getRepository(SystemModuleEntity);
        const hasher = new BcryptPasswordHasher();

        // Catálogo de módulos del sistema (necesario para la matriz de permisos
        // del módulo de Usuarios en instalaciones nuevas, sin datos previos)
        console.log('→ Sembrando módulos del sistema...');
        await seedSystemModules(moduleRepository);

        // Super Administrador inicial del sistema
        let admin = await userRepository.findOne({ where: { username: 'admin' } });
        if (!admin) {
            const passwordHash = await hasher.hash('admin123');
            admin = userRepository.create({
                username: 'admin',
                passwordHash,
                role: Role.SUPER_ADMIN,
                fullName: 'Super Administrador',
                email: 'admin@pendiente.local',
                isActive: true,
            });
            await userRepository.save(admin);
            console.log('✅ Super Admin user created (admin / admin123)');
        } else {
            console.log('ℹ️ Admin user already exists');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding users:', error);
        process.exit(1);
    }
};

seed();
