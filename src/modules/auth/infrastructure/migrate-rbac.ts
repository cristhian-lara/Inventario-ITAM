/**
 * Migración RBAC (idempotente). Ejecutar con el backend DETENIDO:
 *   npx ts-node src/modules/auth/infrastructure/migrate-rbac.ts
 *
 * Fase 1 (SQL directo, sin TypeORM): adapta la tabla users existente
 *   (enum → varchar, columnas nuevas pobladas) para que synchronize
 *   no intente ningún cambio destructivo al arrancar.
 * Fase 2 (TypeORM): crea tablas nuevas vía synchronize y siembra
 *   módulos del sistema + roles/permisos migrados.
 */
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { AppDataSource, initializeDatabase } from '../../../shared/infrastructure/database/postgres';
import { SystemModuleEntity } from './orm/SystemModule.entity';
import { UserPermissionEntity } from './orm/UserPermission.entity';
import { UserEntity } from './orm/User.entity';
import { Role } from '../domain/Role';
import { seedSystemModules } from './systemModulesSeed';

dotenv.config();

// Lectura para usuarios ESTANDAR migrados (antiguos VISUALIZADOR):
// sus pantallas (Dashboard, Mantenimientos, Actas) + lecturas de apoyo.
const STANDARD_READ_MODULES = ['dashboard', 'maintenances', 'actas', 'assets', 'collaborators'];

const fase1 = async () => {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'secret',
        database: process.env.DB_DATABASE || process.env.DB_NAME || 'itam_db',
    });
    await client.connect();
    try {
        await client.query('BEGIN');

        const roleType = await client.query(
            "SELECT udt_name FROM information_schema.columns WHERE table_name='users' AND column_name='role'"
        );
        if (roleType.rows[0]?.udt_name === 'users_role_enum') {
            console.log('→ Convirtiendo users.role de enum a varchar...');
            await client.query('ALTER TABLE users ALTER COLUMN role DROP DEFAULT');
            await client.query('ALTER TABLE users ALTER COLUMN role TYPE varchar(20) USING role::text');
            await client.query('DROP TYPE IF EXISTS users_role_enum');
        } else {
            console.log('ℹ️ users.role ya es varchar');
        }

        console.log('→ Migrando roles: admin→SUPER_ADMIN, VISUALIZADOR→ESTANDAR...');
        await client.query("UPDATE users SET role='SUPER_ADMIN' WHERE username='admin' AND role<>'SUPER_ADMIN'");
        await client.query("UPDATE users SET role='ESTANDAR' WHERE role='VISUALIZADOR'");

        console.log('→ Agregando columnas full_name, email, is_active...');
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name varchar(150)');
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email varchar(150)');
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true');
        await client.query('UPDATE users SET full_name = username WHERE full_name IS NULL');
        await client.query("UPDATE users SET email = username || '@pendiente.local' WHERE email IS NULL");
        await client.query('ALTER TABLE users ALTER COLUMN full_name SET NOT NULL');
        await client.query('ALTER TABLE users ALTER COLUMN email SET NOT NULL');

        await client.query('COMMIT');
        console.log('✅ Fase 1 completada (tabla users adaptada)');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        await client.end();
    }
};

const fase2 = async () => {
    await initializeDatabase(); // synchronize crea system_modules y user_permissions

    const moduleRepo = AppDataSource.getRepository(SystemModuleEntity);
    const permissionRepo = AppDataSource.getRepository(UserPermissionEntity);
    const userRepo = AppDataSource.getRepository(UserEntity);

    console.log('→ Sembrando módulos del sistema...');
    await seedSystemModules(moduleRepo);

    const modules = await moduleRepo.find();
    const moduleByKey = new Map(modules.map(m => [m.key, m]));

    console.log('→ Asignando permisos a usuarios migrados (solo si no tienen ninguno)...');
    const users = await userRepo.find();
    for (const user of users) {
        if (user.role === Role.SUPER_ADMIN) continue; // acceso total implícito

        const existing = await permissionRepo.count({ where: { userId: user.id } });
        if (existing > 0) continue; // no pisar configuraciones manuales

        if (user.role === Role.ESTANDAR) {
            for (const key of STANDARD_READ_MODULES) {
                const mod = moduleByKey.get(key);
                if (!mod) continue;
                await permissionRepo.save(permissionRepo.create({
                    userId: user.id, moduleId: mod.id,
                    canRead: true, canCreate: false, canEdit: false, canDelete: false,
                }));
            }
            console.log(`   ✅ ${user.username}: lectura en ${STANDARD_READ_MODULES.join(', ')}`);
        } else if (user.role === Role.ADMINISTRADOR) {
            for (const mod of modules) {
                if (mod.key === 'users') continue; // gestión de usuarios no se otorga por defecto
                await permissionRepo.save(permissionRepo.create({
                    userId: user.id, moduleId: mod.id,
                    canRead: true, canCreate: true, canEdit: true, canDelete: true,
                }));
            }
            console.log(`   ✅ ${user.username}: acceso completo a módulos operativos`);
        }
    }

    await AppDataSource.destroy();
    console.log('✅ Fase 2 completada (módulos y permisos sembrados)');
};

(async () => {
    try {
        await fase1();
        await fase2();
        console.log('🎉 Migración RBAC finalizada');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error en la migración RBAC:', error);
        process.exit(1);
    }
})();
