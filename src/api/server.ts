import express from 'express';
import cors from 'cors';
import catalogRoutes from './routes/catalog.routes';
import assignmentRoutes from './routes/assignment.routes';
import { collaboratorRouter } from './routes/collaborator.routes';
import dashboardRouter from './routes/dashboard.routes';
import { maintenanceRouter } from './routes/maintenance.routes';
import settingsRoutes from './routes/settings.routes';
import { initializeDatabase } from '../shared/infrastructure/database/postgres';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'ITAM API is running' });
});

// Exponer la carpeta de PDFs estáticamente
app.use('/pdfs', express.static(path.join(__dirname, '../../storage/pdfs')));

// Registrar Rutas
app.use('/api/catalog', catalogRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/collaborators', collaboratorRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/maintenances', maintenanceRouter);
app.use('/api/settings', settingsRoutes);

// Iniciar Base de Datos y Servidor
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
});
