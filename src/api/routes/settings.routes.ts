import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../shared/infrastructure/database/postgres';
import { SettingEntity } from '../../modules/settings/infrastructure/orm/Setting.entity';

const router = Router();

// GET /api/settings
router.get('/', async (req: Request, res: Response) => {
    try {
        const settingRepository = AppDataSource.getRepository(SettingEntity);
        const settings = await settingRepository.find();
        
        // Convert to key-value object
        const settingsObj = settings.reduce((acc: any, curr: any) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {} as Record<string, string>);

        res.json(settingsObj);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Error fetching settings' });
    }
});

// PUT /api/settings
router.put('/', async (req: Request, res: Response) => {
    try {
        const updates = req.body; // e.g. { ACTA_ASIGNACION_TEXT: '...', ... }
        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ error: 'Invalid payload' });
        }

        const settingRepository = AppDataSource.getRepository(SettingEntity);

        for (const [key, value] of Object.entries(updates)) {
            let setting = await settingRepository.findOneBy({ key });
            if (!setting) {
                setting = settingRepository.create({ key, value: value as string });
            } else {
                setting.value = value as string;
            }
            await settingRepository.save(setting);
        }

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Error updating settings' });
    }
});

export default router;
