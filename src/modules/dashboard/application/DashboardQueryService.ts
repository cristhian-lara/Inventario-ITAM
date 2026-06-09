import { DataSource } from 'typeorm';

export interface DashboardMetrics {
    totalAssets: number;
    activeAssignments: number;
    expiringWarranties: number;
    obsoleteAssets: number;
    utilizationRate: number;
    recentActivity: Array<{
        id: string;
        collaboratorId: string;
        description: string;
        date: Date;
        type: 'ASSIGNMENT' | 'RETURN' | 'FORCE_RETURN';
    }>;
    assetsByStatus: Array<{ status: string; count: number }>;
    assetsByCategory: Array<{ categoryName: string; count: number }>;
}

export class DashboardQueryService {
    constructor(private readonly dataSource: DataSource) {}

    async getMetrics(): Promise<DashboardMetrics> {
        // 1. Total Assets
        const assetsResult = await this.dataSource.query(`SELECT COUNT(*) as count FROM assets`);
        const totalAssets = parseInt(assetsResult[0].count, 10);

        // 2. Active Assignments (Activos que están actualmente asignados/en uso)
        const assignmentsResult = await this.dataSource.query(`SELECT COUNT(*) as count FROM assets WHERE status = 'IN_USE'`);
        const activeAssignments = parseInt(assignmentsResult[0].count, 10);

        // 3. Expiring Warranties (Expiring in the next 30 days)
        const expiringWarrantiesResult = await this.dataSource.query(`
            SELECT COUNT(*) as count 
            FROM assets 
            WHERE purchase_date IS NOT NULL 
              AND warranty_months IS NOT NULL
              AND (purchase_date + (warranty_months || ' months')::interval) <= (CURRENT_DATE + interval '30 days')
              AND (purchase_date + (warranty_months || ' months')::interval) >= CURRENT_DATE
        `);
        const expiringWarranties = parseInt(expiringWarrantiesResult[0].count, 10); 

        // 3.1 Utilization Rate
        const utilizationRate = totalAssets > 0 ? Math.round((activeAssignments / totalAssets) * 100) : 0;

        // 3.2 Obsolete / At-Risk Assets (100% depreciated or warranty expired, and still IN_USE)
        const obsoleteAssetsResult = await this.dataSource.query(`
            SELECT COUNT(*) as count 
            FROM assets 
            WHERE status = 'IN_USE' 
              AND (
                 (purchase_date IS NOT NULL AND warranty_months IS NOT NULL AND (purchase_date + (warranty_months || ' months')::interval) < CURRENT_DATE)
                 OR
                 (purchase_date IS NOT NULL AND depreciation_years IS NOT NULL AND (purchase_date + (depreciation_years || ' years')::interval) < CURRENT_DATE)
              )
        `);
        const obsoleteAssets = parseInt(obsoleteAssetsResult[0].count, 10);

        // 4. Recent Activity (Latest assignments)
        const recentActivityRaw = await this.dataSource.query(`
            SELECT 
                a.id, 
                a.status, 
                a.start_date, 
                a.end_date, 
                a.asset_id,
                a.collaborator_id,
                c.name as collaborator_name
            FROM assignments a
            LEFT JOIN collaborators c ON a.collaborator_id = c.id
            ORDER BY COALESCE(a.end_date, a.start_date) DESC
            LIMIT 5
        `);

        const recentActivity = recentActivityRaw.map((row: any) => {
            let type = 'ASSIGNMENT';
            let description = `${row.collaborator_name} tiene asignado el equipo ${row.asset_id}`;
            let date = row.start_date;

            if (row.status === 'RETURNED' || row.status === 'FORCED_RETURN') {
                type = row.status === 'RETURNED' ? 'RETURN' : 'FORCE_RETURN';
                description = `${row.collaborator_name} devolvió el equipo ${row.asset_id}`;
                date = row.end_date;
            } else if (row.status === 'PENDING_ACCEPTANCE') {
                description = `${row.collaborator_name} tiene pendiente firmar la asignación del equipo ${row.asset_id}`;
            }

            return {
                id: row.id,
                collaboratorId: row.collaborator_id,
                description,
                date,
                type
            };
        });

        // 5. Assets by Status
        const assetsByStatusRaw = await this.dataSource.query(`
            SELECT status, COUNT(*) as count 
            FROM assets 
            GROUP BY status
        `);
        const assetsByStatus = assetsByStatusRaw.map((r: any) => ({
            status: r.status,
            count: parseInt(r.count, 10)
        }));

        // 6. Assets by Category
        const assetsByCategoryRaw = await this.dataSource.query(`
            SELECT c.name as "categoryName", COUNT(a.id) as count 
            FROM categories c
            LEFT JOIN assets a ON a.category_id = c.id
            GROUP BY c.id, c.name
            HAVING COUNT(a.id) > 0
        `);
        const assetsByCategory = assetsByCategoryRaw.map((r: any) => ({
            categoryName: r.categoryName,
            count: parseInt(r.count, 10)
        }));

        return {
            totalAssets,
            activeAssignments,
            expiringWarranties,
            obsoleteAssets,
            utilizationRate,
            recentActivity,
            assetsByStatus,
            assetsByCategory
        };
    }
}
