import { Collaborator } from './Collaborator';
import { CollaboratorHistory } from './CollaboratorHistory';

export interface ICollaboratorRepository {
    save(collaborator: Collaborator): Promise<void>;
    findById(id: string): Promise<Collaborator | null>;
    findByEmail(email: string): Promise<Collaborator | null>;
    findAll(): Promise<Collaborator[]>;
    findAllPaginated(page: number, limit: number): Promise<{ items: Collaborator[]; total: number }>;
    update(collaborator: Collaborator): Promise<void>;
    saveHistory(history: CollaboratorHistory): Promise<void>;
    getHistory(collaboratorId: string): Promise<CollaboratorHistory[]>;
}
