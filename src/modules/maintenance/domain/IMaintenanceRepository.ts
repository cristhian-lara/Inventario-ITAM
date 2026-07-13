import { MaintenanceRecord } from './MaintenanceRecord';
import { MaintenanceStatus } from './MaintenanceTypes';

export interface IMaintenanceRepository {
    save(record: MaintenanceRecord): Promise<void>;
    findById(id: string): Promise<MaintenanceRecord | null>;
    findByAssetId(assetId: string): Promise<MaintenanceRecord[]>;
    findAll(filters?: { status?: MaintenanceStatus, isExpired?: boolean }): Promise<MaintenanceRecord[]>;
    findByIds(ids: string[]): Promise<MaintenanceRecord[]>;
    findMaintenancesDueWithinDays(days: number): Promise<MaintenanceRecord[]>;
}
