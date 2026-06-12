import { Department } from './Department';

export interface IDepartmentRepository {
    save(department: Department): Promise<void>;
    findById(id: number): Promise<Department | null>;
    findAll(): Promise<Department[]>;
}
