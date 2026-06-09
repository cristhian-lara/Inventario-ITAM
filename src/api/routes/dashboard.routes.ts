import { Router } from 'express';
import { DashboardQueryService } from '../../modules/dashboard/application/DashboardQueryService';
import { AppDataSource } from '../../shared/infrastructure/database/postgres';

const dashboardRouter = Router();

dashboardRouter.get('/', async (req, res) => {
    try {
        const queryService = new DashboardQueryService(AppDataSource);
        const metrics = await queryService.getMetrics();
        res.json(metrics);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default dashboardRouter;
