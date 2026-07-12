import express from 'express';
import cors from 'cors';
import catalogRoutes from './routes/catalog.routes';
import assignmentRoutes from './routes/assignment.routes';
import { collaboratorRouter } from './routes/collaborator.routes';
import dashboardRouter from './routes/dashboard.routes';
import { maintenanceRouter } from './routes/maintenance.routes';
import settingsRoutes from './routes/settings.routes';
import { initializeDatabase } from '../shared/infrastructure/database/postgres';
import { scheduleLoanExpiryAlertJob } from '../modules/assignment/infrastructure/LoanAlertJob';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// No exponer la tecnología del servidor
app.disable('x-powered-by');

// CORS con lista de orígenes permitidos (configurable por env).
// En desarrollo se acepta cualquier puerto de localhost / red local (Vite puede
// arrancar en un puerto distinto a 5173 cuando el predeterminado está ocupado).
// Las peticiones sin cabecera Origin (curl, enlaces de firma, misma-origin vía proxy) se permiten.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',').map(o => o.trim()).filter(Boolean);
const DEV_ORIGIN_PATTERN = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}):\d+$/;
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || DEV_ORIGIN_PATTERN.test(origin)) return callback(null, true);
        callback(new Error('Origen no permitido por CORS'));
    }
}));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'ITAM API is running' });
});

// Exponer la carpeta de PDFs estáticamente
app.use('/pdfs', express.static(path.join(__dirname, '../../storage/pdfs')));

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import { documentRouter } from './routes/document.routes';
import { apiGuard } from './middlewares/apiGuard.middleware';

// Guard global: autenticación para todo /api y escritura solo para ADMINISTRADOR
// (los enlaces públicos de firma están exentos dentro del guard)
app.use('/api', apiGuard);

// Registrar Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRouter);
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
  scheduleLoanExpiryAlertJob();
}).catch((error) => {
  console.error('Failed to start server:', error);
});
