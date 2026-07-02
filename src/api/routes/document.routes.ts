import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';

export const documentRouter = Router();

documentRouter.get('/', (req, res) => {
    try {
        const storageDir = path.join(__dirname, '../../../storage/pdfs');
        
        if (!fs.existsSync(storageDir)) {
            return res.json({ assignments: [], returns: [], maintenances: [] });
        }

        const files = fs.readdirSync(storageDir);
        const result = {
            assignments: [] as any[],
            returns: [] as any[],
            maintenances: [] as any[]
        };

        for (const file of files) {
            if (!file.endsWith('.pdf')) continue;

            const filePath = path.join(storageDir, file);
            const stats = fs.statSync(filePath);
            
            const fileData = {
                filename: file,
                url: `/pdfs/${file}`,
                date: stats.mtime.toISOString(),
            };

            // Formato nuevo: "Acta de Asignacion - Nombre - ID.pdf"
            if (file.startsWith('Acta de Asignacion -') || file.startsWith('acta-')) {
                result.assignments.push(fileData);
            // Formato nuevo: "Paz y Salvo - Nombre - ID.pdf"
            } else if (file.startsWith('Paz y Salvo -') || file.startsWith('pazysalvo-')) {
                result.returns.push(fileData);
            // Formato nuevo: "Acta de Mantenimiento - Nombre - ID.pdf"
            } else if (file.startsWith('Acta de Mantenimiento -') || file.startsWith('acta_mantenimiento_')) {
                result.maintenances.push(fileData);
            }
        }

        result.assignments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        result.returns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        result.maintenances.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: 'Error reading documents directory', details: error.message });
    }
});
