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

            // Formato actual: "Asignación Nombre - ID.pdf" | Anteriores: "Acta de Asignacion - ...", "acta-..."
            if (file.startsWith('Asignación ') || file.startsWith('Asignacion ') || file.startsWith('Acta de Asignacion -') || file.startsWith('acta-')) {
                result.assignments.push(fileData);
            // Formato actual: "Devolución Nombre - ID.pdf" (parcial) o "Paz y Salvo Nombre - ID.pdf" (total)
            } else if (file.startsWith('Devolución ') || file.startsWith('Devolucion ') || file.startsWith('Paz y Salvo') || file.startsWith('pazysalvo-')) {
                result.returns.push(fileData);
            // Formato actual: "Mantenimiento Nombre - ID.pdf" | Anteriores: "Acta de Mantenimiento - ...", "acta_mantenimiento_..."
            } else if (file.startsWith('Mantenimiento ') || file.startsWith('Acta de Mantenimiento -') || file.startsWith('acta_mantenimiento_')) {
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
