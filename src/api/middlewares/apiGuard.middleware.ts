import { Response, NextFunction } from 'express';
import { AuthRequest, authenticateJWT } from './auth.middleware';

/**
 * Guard global del API:
 * - Endpoints públicos (login y firmas por enlace con token propio): pasan sin sesión.
 * - Lecturas (GET/HEAD): cualquier usuario autenticado (ADMINISTRADOR o VISUALIZADOR).
 * - Escrituras (POST/PUT/PATCH/DELETE): solo ADMINISTRADOR.
 *
 * Los enlaces de firma que reciben los colaboradores por Webex validan su propio
 * JWT de firma dentro de cada endpoint, por eso quedan fuera de la sesión de la app.
 */
const PUBLIC_ENDPOINTS: { method: string; pattern: RegExp }[] = [
    { method: 'POST', pattern: /^\/auth\/login$/ },
    // Firma de asignación y devolución (enlace enviado al colaborador)
    { method: 'GET', pattern: /^\/assignments\/[^/]+\/accept$/ },
    { method: 'GET', pattern: /^\/assignments\/[^/]+\/confirm-return$/ },
    { method: 'GET', pattern: /^\/assignments\/batch-accept-return$/ },
    // Firma de mantenimiento (página pública /maintenances/sign/:token)
    { method: 'GET', pattern: /^\/maintenances\/verify-token\/[^/]+$/ },
    { method: 'POST', pattern: /^\/maintenances\/sign$/ },
];

export const apiGuard = (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Preflight CORS
    if (req.method === 'OPTIONS') return next();

    const isPublic = PUBLIC_ENDPOINTS.some(e => e.method === req.method && e.pattern.test(req.path));
    if (isPublic) return next();

    authenticateJWT(req, res, () => {
        const isReadOnly = req.method === 'GET' || req.method === 'HEAD';
        if (isReadOnly) return next();

        if (req.user?.role === 'ADMINISTRADOR') return next();

        res.status(403).json({ error: 'No tienes permisos suficientes para realizar esta acción.' });
    });
};
