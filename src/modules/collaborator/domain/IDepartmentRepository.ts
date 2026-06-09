import { Department } from './Department';

export interface IDepartmentRepository {
    save(department: Department): Promise<void>;
    findById(id: string): Promise<Department | null>;
    findAll(): Promise<Department[]>;
}
