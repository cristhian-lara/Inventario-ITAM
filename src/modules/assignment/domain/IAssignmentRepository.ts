import { Assignment } from './Assignment';

export interface IAssignmentRepository {
    save(assignment: Assignment): Promise<void>;
    findById(id: string): Promise<Assignment | null>;
    findByIds(ids: string[]): Promise<Assignment[]>;
    findAllActive(): Promise<Assignment[]>;
    findActiveByAssetId(assetId: string): Promise<Assignment | null>;
    findCurrentByAssetId(assetId: string): Promise<Assignment | null>;
    /**
     * Préstamos activos (ACCEPTED) cuya fecha de devolución vence dentro de
     * `days` días, incluyendo los ya vencidos.
     */
    findLoansDueWithinDays(days: number): Promise<Assignment[]>;
}
