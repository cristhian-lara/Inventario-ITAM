import { AppDataSource, initializeDatabase } from '../../../shared/infrastructure/database/postgres';
import { UserEntity } from './orm/User.entity';
import { Role } from '../domain/Role';
import { BcryptPasswordHasher } from './services/BcryptPasswordHasher';

const seed = async () => {
    try {
        await initializeDatabase();
        const userRepository = AppDataSource.getRepository(UserEntity);
        const hasher = new BcryptPasswordHasher();

        // Check if admin exists
        let admin = await userRepository.findOne({ where: { username: 'admin' } });
        if (!admin) {
            const passwordHash = await hasher.hash('admin123');
            admin = userRepository.create({
                username: 'admin',
                passwordHash,
                role: Role.ADMINISTRADOR
            });
            await userRepository.save(admin);
            console.log('✅ Admin user created (admin / admin123)');
        } else {
            console.log('ℹ️ Admin user already exists');
        }

        // Check if visualizador exists
        let viewer = await userRepository.findOne({ where: { username: 'viewer' } });
        if (!viewer) {
            const passwordHash = await hasher.hash('viewer123');
            viewer = userRepository.create({
                username: 'viewer',
                passwordHash,
                role: Role.VISUALIZADOR
            });
            await userRepository.save(viewer);
            console.log('✅ Viewer user created (viewer / viewer123)');
        } else {
            console.log('ℹ️ Viewer user already exists');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding users:', error);
        process.exit(1);
    }
};

seed();
