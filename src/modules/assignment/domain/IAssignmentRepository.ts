import { Assignment } from './Assignment';

export interface IAssignmentRepository {
    save(assignment: Assignment): Promise<void>;
    findById(id: string): Promise<Assignment | null>;
    findAllActive(): Promise<Assignment[]>;
    findActiveByAssetId(assetId: string): Promise<Assignment | null>;
    findCurrentByAssetId(assetId: string): Promise<Assignment | null>;
}
