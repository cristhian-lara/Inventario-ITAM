import { Repository } from 'typeorm';
import { SystemModuleEntity } from './orm/SystemModule.entity';

// supports*: acciones que el módulo realmente ofrece — Dashboard y Actas son de
// solo consulta, por lo que su matriz únicamente habilita Lectura.
export const SYSTEM_MODULES: { key: string; name: string; displayOrder: number; supportsCreate: boolean; supportsEdit: boolean; supportsDelete: boolean }[] = [
    { key: 'dashboard', name: 'Dashboard', displayOrder: 1, supportsCreate: false, supportsEdit: false, supportsDelete: false },
    { key: 'users', name: 'Usuarios', displayOrder: 2, supportsCreate: true, supportsEdit: true, supportsDelete: true },
    { key: 'settings', name: 'Configuración', displayOrder: 3, supportsCreate: true, supportsEdit: true, supportsDelete: false },
    { key: 'collaborators', name: 'Colaboradores', displayOrder: 4, supportsCreate: true, supportsEdit: true, supportsDelete: false },
    { key: 'assets', name: 'Equipos (Catálogo)', displayOrder: 5, supportsCreate: true, supportsEdit: true, supportsDelete: true },
    { key: 'maintenances', name: 'Mantenimientos', displayOrder: 6, supportsCreate: true, supportsEdit: true, supportsDelete: false },
    { key: 'actas', name: 'Actas', displayOrder: 7, supportsCreate: false, supportsEdit: false, supportsDelete: false },
];

/** Crea los módulos del sistema que falten y actualiza capacidades si cambiaron. Idempotente. */
export async function seedSystemModules(moduleRepo: Repository<SystemModuleEntity>): Promise<void> {
    for (const mod of SYSTEM_MODULES) {
        const existing = await moduleRepo.findOne({ where: { key: mod.key } });
        if (!existing) {
            await moduleRepo.save(moduleRepo.create({ ...mod, isActive: true }));
            console.log(`   ✅ Módulo ${mod.key}`);
        } else if (
            existing.supportsCreate !== mod.supportsCreate ||
            existing.supportsEdit !== mod.supportsEdit ||
            existing.supportsDelete !== mod.supportsDelete
        ) {
            existing.supportsCreate = mod.supportsCreate;
            existing.supportsEdit = mod.supportsEdit;
            existing.supportsDelete = mod.supportsDelete;
            await moduleRepo.save(existing);
            console.log(`   ↺ Módulo ${mod.key}: capacidades actualizadas`);
        }
    }
}
