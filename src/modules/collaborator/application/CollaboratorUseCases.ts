import { v4 as uuidv4 } from 'uuid';
import { Collaborator } from '../domain/Collaborator';
import { CollaboratorHistory } from '../domain/CollaboratorHistory';
import { ICollaboratorRepository } from '../domain/ICollaboratorRepository';
import { IDepartmentRepository } from '../domain/IDepartmentRepository';
import { Department } from '../domain/Department';
import { Cecos } from '../domain/Cecos';
import { ICecosRepository } from '../domain/ICecosRepository';

interface CreateCollaboratorDTO {
    name: string;
    email: string;
    department: number;
    location: string;
    isLeader?: boolean;
    leaderId?: string | null;
    dynamicAttributes?: Record<string, any>;
    activationDate?: string | Date;
}

export class CollaboratorUseCases {
    constructor(
        private readonly collaboratorRepo: ICollaboratorRepository,
        private readonly departmentRepo: IDepartmentRepository,
        private readonly cecosRepo: ICecosRepository
    ) { }

    async createCollaborator(data: CreateCollaboratorDTO): Promise<Collaborator> {
        const existing = await this.collaboratorRepo.findByEmail(data.email);
        if (existing) {
            throw new Error('A collaborator with this email already exists');
        }

        const department = await this.departmentRepo.findById(data.department);
        if (!department) {
            throw new Error('Department not found');
        }

        if (data.isLeader) {
            const existingLeader = await this.collaboratorRepo.findActiveLeaderInDepartment(Number(department.id));
            if (existingLeader) {
                throw new Error(`El departamento '${department.name}' ya tiene un líder asignado.`);
            }
        }

        const collaborator = Collaborator.create(
            uuidv4(),
            data.name,
            data.email,
            data.department,
            data.location,
            data.activationDate ? new Date(data.activationDate) : new Date(), // activationDate
            data.isLeader || false,
            data.leaderId || null,
            data.dynamicAttributes || {}
        );

        await this.collaboratorRepo.save(collaborator);

        await this.collaboratorRepo.saveHistory(new CollaboratorHistory(
            uuidv4(),
            collaborator.id,
            'CREATED',
            new Date(),
            'Alta inicial de sistema'
        ));

        return collaborator;
    }

    async toggleCollaboratorStatus(id: string): Promise<Collaborator> {
        const collaborator = await this.collaboratorRepo.findById(id);
        if (!collaborator) {
            throw new Error('Collaborator not found');
        }

        const newStatus = collaborator.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        const deactivationDate = newStatus === 'INACTIVE' ? new Date() : null;

        const updated = new Collaborator(
            collaborator.id,
            collaborator.name,
            collaborator.email,
            collaborator.department,
            collaborator.location,
            newStatus,
            collaborator.activationDate,
            deactivationDate,
            collaborator.createdAt,
            collaborator.isLeader,
            collaborator.leaderId,
            collaborator.dynamicAttributes
        );

        await this.collaboratorRepo.update(updated);

        await this.collaboratorRepo.saveHistory(new CollaboratorHistory(
            uuidv4(),
            updated.id,
            newStatus === 'ACTIVE' ? 'ACTIVATED' : 'DEACTIVATED',
            new Date(),
            `Cambiado por administrador a ${newStatus}`
        ));

        return updated;
    }

    async getAllCollaborators(): Promise<Collaborator[]> {
        return this.collaboratorRepo.findAll();
    }

    async getCollaboratorsPaginated(page: number, limit: number): Promise<{ items: Collaborator[]; total: number }> {
        return this.collaboratorRepo.findAllPaginated(page, limit);
    }

    async getCollaboratorById(id: string): Promise<Collaborator | null> {
        return this.collaboratorRepo.findById(id);
    }

    async getCollaboratorHistory(id: string): Promise<CollaboratorHistory[]> {
        return this.collaboratorRepo.getHistory(id);
    }

    // --- Department Use Cases ---

    async createDepartment(data: { name: string, description?: string }): Promise<Department> {
        const department = Department.create(data.name, data.description || null);
        await this.departmentRepo.save(department);
        return department;
    }

    async getAllDepartments(): Promise<Department[]> {
        return this.departmentRepo.findAll();
    }

    async updateDepartment(id: number, name: string, description?: string): Promise<Department> {
        const existing = await this.departmentRepo.findById(id);
        if (!existing) {
            throw new Error(`Department with ID ${id} not found`);
        }

        const updated = new Department(existing.id, name, description || null, existing.createdAt);
        await this.departmentRepo.save(updated);
        return updated;
    }

    // --- CECOS ---
    async createCecos(id: string, name: string, description: string): Promise<Cecos> {
        const existing = await this.cecosRepo.findById(id);
        if (existing) throw new Error(`El CECOS con ID ${id} ya existe.`);
        const cecos = new Cecos(id, name, description);
        await this.cecosRepo.save(cecos);
        return cecos;
    }

    async updateCecos(id: string, name: string, description: string): Promise<Cecos> {
        const cecos = await this.cecosRepo.findById(id);
        if (!cecos) throw new Error(`El CECOS con ID ${id} no fue encontrado.`);
        cecos.update(name, description);
        await this.cecosRepo.save(cecos);
        return cecos;
    }

    async getAllCecos(): Promise<Cecos[]> {
        return await this.cecosRepo.findAll();
    }


    async updateCollaborator(
        id: string,
        name: string,
        departmentId: number,
        location: string,
        status: 'ACTIVE' | 'INACTIVE',
        isLeader: boolean,
        leaderId?: string,
        dynamicAttributes?: Record<string, any>,
        activationDate?: string | Date
    ): Promise<Collaborator> {
        const collaborator = await this.collaboratorRepo.findById(id);
        if (!collaborator) {
            throw new Error(`El colaborador con ID ${id} no existe.`);
        }

        const department = await this.departmentRepo.findById(departmentId);
        if (!department) {
            throw new Error(`El departamento con ID ${departmentId} no existe.`);
        }

        if (isLeader) {
            const existingLeader = await this.collaboratorRepo.findActiveLeaderInDepartment(Number(department.id), collaborator.id);
            if (existingLeader) {
                throw new Error(`El departamento '${department.name}' ya tiene un líder asignado.`);
            }
        }

        const finalLeaderId = isLeader ? null : (leaderId || null);
        const finalDynamicAttributes = dynamicAttributes || collaborator.dynamicAttributes;

        const updated = new Collaborator(
            collaborator.id,
            name,
            collaborator.email,
            department.id!,
            location,
            status,
            activationDate ? new Date(activationDate) : collaborator.activationDate,
            status === 'INACTIVE' ? new Date() : collaborator.deactivationDate,
            collaborator.createdAt,
            isLeader,
            finalLeaderId,
            finalDynamicAttributes
        );

        await this.collaboratorRepo.update(updated);

        if (collaborator.status !== status) {
            const action = status === 'ACTIVE' ? 'ACTIVATED' : 'DEACTIVATED';
            await this.collaboratorRepo.saveHistory(new CollaboratorHistory(
                uuidv4(),
                updated.id,
                action,
                new Date(),
                `Actualizado manualmente a ${status}`
            ));
        }

        if (String(collaborator.department) !== String(department.id)) {
            const oldDepartment = await this.departmentRepo.findById(Number(collaborator.department));
            await this.collaboratorRepo.saveHistory(new CollaboratorHistory(
                uuidv4(),
                updated.id,
                'DEPARTMENT_CHANGED',
                new Date(),
                `Cambió del departamento "${oldDepartment?.name || collaborator.department}" a "${department.name}"`
            ));
        }

        return updated;
    }

    async importCollaborators(records: any[]): Promise<{ successful: number; failed: number; errors: string[] }> {
        let successful = 0;
        let failed = 0;
        const errors: string[] = [];

        const allDepartments = await this.departmentRepo.findAll();
        const allCecos = await this.cecosRepo.findAll();

        for (const [index, record] of records.entries()) {
            try {
                const name = record.Name || record.name || record.Nombre || record.nombre;
                const email = record.Email || record.email || record.Correo || record.correo;
                const departmentName = record.Department || record.department || record.Departamento || record.departamento;
                const location = record.Location || record.location || record.Ubicacion || record.Ubicación || record.ubicacion;
                const cecosId = record.CECOS || record.Cecos || record.cecos || record.Ceco || record.ceco || record.CentroCostos || record.centroCostos || record['Centro de costos'] || record['Centro de Costos'];
                const activationDateRaw = record.FechaAlta || record.fechaAlta || record.ActivationDate || record.activationDate || record['Fecha de Alta'] || record['Fecha de alta'];

                let isLeader = false;
                const leaderRaw = record.isLeader || record.IsLeader || record.EsLider || record.esLider || record['Es Líder'] || record['Es lider'];

                if (leaderRaw !== undefined) {
                    const val = String(leaderRaw).toLowerCase().trim();
                    isLeader = val === 'sí' || val === 'si' || val === 'true' || val === '1' || val === 'yes';
                }

                if (!name || !email || !departmentName || !location) {
                    throw new Error('Faltan campos obligatorios (Nombre, Email, Departamento, Ubicación)');
                }

                const department = allDepartments.find(d => d.name.toLowerCase() === String(departmentName).toLowerCase());
                if (!department) {
                    throw new Error(`El departamento '${departmentName}' no existe.`);
                }

                let finalCecosId = cecosId ? String(cecosId).trim() : undefined;
                if (finalCecosId) {
                    const cecoMatch = allCecos.find(c => String(c.id) === finalCecosId || c.name.toLowerCase() === finalCecosId!.toLowerCase());
                    if (cecoMatch) {
                        finalCecosId = String(cecoMatch.id);
                    }
                }

                let parsedDate = new Date();
                if (activationDateRaw) {
                    if (activationDateRaw instanceof Date) {
                        parsedDate = activationDateRaw;
                    } else if (typeof activationDateRaw === 'string') {
                        const parts = activationDateRaw.split('/');
                        if (parts.length === 3) {
                            parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`);
                        } else {
                            parsedDate = new Date(activationDateRaw);
                        }
                    } else if (typeof activationDateRaw === 'number') {
                        parsedDate = new Date(Math.round((activationDateRaw - 25569) * 86400 * 1000));
                    }
                }

                const normalizedEmail = String(email).trim();
                const existing = await this.collaboratorRepo.findByEmail(normalizedEmail);

                if (existing) {
                    // Upsert: el colaborador ya existe. Solo actualizamos el CECO (sin
                    // tocar estado, nombre, departamento ni ubicación) para no reactivar
                    // bajas ni sobreescribir ediciones manuales.
                    if (finalCecosId) {
                        const updated = new Collaborator(
                            existing.id,
                            existing.name,
                            existing.email,
                            existing.department,
                            existing.location,
                            existing.status,
                            existing.activationDate,
                            existing.deactivationDate,
                            existing.createdAt,
                            existing.isLeader,
                            existing.leaderId,
                            { ...existing.dynamicAttributes, CECOS: finalCecosId }
                        );
                        await this.collaboratorRepo.update(updated);
                    }
                    successful++;
                    continue;
                }

                await this.createCollaborator({
                    name: String(name).trim(),
                    email: normalizedEmail,
                    department: Number(department.id),
                    location: String(location).trim(),
                    isLeader: isLeader,
                    dynamicAttributes: finalCecosId ? { CECOS: finalCecosId } : {},
                    activationDate: parsedDate
                });
                successful++;
            } catch (error: any) {
                failed++;
                errors.push(`Fila ${index + 2}: ${error.message}`);
            }
        }

        return { successful, failed, errors };
    }
}