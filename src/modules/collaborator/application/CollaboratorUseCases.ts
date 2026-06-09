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
    department: string;
    location: string;
    isLeader?: boolean;
    leaderId?: string | null;
    dynamicAttributes?: Record<string, any>;
}

export class CollaboratorUseCases {
    constructor(
        private readonly collaboratorRepo: ICollaboratorRepository,
        private readonly departmentRepo: IDepartmentRepository,
        private readonly cecosRepo: ICecosRepository
    ) {}

    async createCollaborator(data: CreateCollaboratorDTO): Promise<Collaborator> {
        const existing = await this.collaboratorRepo.findByEmail(data.email);
        if (existing) {
            throw new Error('A collaborator with this email already exists');
        }

        const department = await this.departmentRepo.findById(data.department);
        if (!department) {
            throw new Error('Department not found');
        }

        const collaborator = Collaborator.create(
            uuidv4(),
            data.name,
            data.email,
            data.department,
            data.location,
            new Date(), // activationDate
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

    async getCollaboratorById(id: string): Promise<Collaborator | null> {
        return this.collaboratorRepo.findById(id);
    }

    async getCollaboratorHistory(id: string): Promise<CollaboratorHistory[]> {
        return this.collaboratorRepo.getHistory(id);
    }

    // --- Department Use Cases ---

    async createDepartment(data: { id: string, name: string, description?: string }): Promise<Department> {
        const existing = await this.departmentRepo.findById(data.id);
        if (existing) {
            throw new Error(`Department with ID ${data.id} already exists`);
        }
        
        const department = Department.create(data.id, data.name, data.description || null);
        await this.departmentRepo.save(department);
        return department;
    }

    async getAllDepartments(): Promise<Department[]> {
        return this.departmentRepo.findAll();
    }

    async updateDepartment(id: string, name: string, description?: string): Promise<Department> {
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
        departmentId: string,
        location: string,
        status: 'ACTIVE' | 'INACTIVE',
        isLeader: boolean,
        leaderId?: string,
        dynamicAttributes?: Record<string, any>
    ): Promise<Collaborator> {
        const collaborator = await this.collaboratorRepo.findById(id);
        if (!collaborator) {
            throw new Error(`El colaborador con ID ${id} no existe.`);
        }
        
        const department = await this.departmentRepo.findById(departmentId);
        if (!department) {
            throw new Error(`El departamento con ID ${departmentId} no existe.`);
        }
        
        const finalLeaderId = isLeader ? null : (leaderId || null);
        const finalDynamicAttributes = dynamicAttributes || collaborator.dynamicAttributes;
        
        const updated = new Collaborator(
            collaborator.id,
            name,
            collaborator.email,
            department.name,
            location,
            status,
            collaborator.activationDate,
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
        
        return updated;
    }

}