import { Assignment } from './Assignment';

export interface IAssignmentRepository {
    save(assignment: Assignment): Promise<void>;
    findById(id: string): Promise<Assignment | null>;
    findByIds(ids: string[]): Promise<Assignment[]>;
    findAllActive(): Promise<Assignment[]>;
    findActiveByAssetId(assetId: string): Promise<Assignment | null>;
    findCurrentByAssetId(assetId: string): Promise<Assignment | null>;
    /**
     * Indica si el activo ya tuvo un colaborador en su hoja de vida: existe al menos
     * una asignación previa que llegó a devolverse (estado RETURNED). Se usa para
     * distinguir un computador reasignado de uno que se asigna por primera vez.
     */
    hasPreviousAssignment(assetId: string): Promise<boolean>;
    /**
     * Préstamos activos (ACCEPTED) cuya fecha de devolución vence dentro de
     * `days` días, incluyendo los ya vencidos.
     */
    findLoansDueWithinDays(days: number): Promise<Assignment[]>;
}
