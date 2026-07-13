import { Response, NextFunction } from 'express';
import { AuthRequest, authenticateJWT } from './auth.middleware';
import { resolveRoutePermission } from './permission-map';
import { PostgresUserRepository } from '../../modules/auth/infrastructure/repositories/PostgresUserRepository';
import { PostgresPermissionRepository } from '../../modules/auth/infrastructure/repositories/PostgresPermissionRepository';
import { Role } from '../../modules/auth/domain/Role';
import { createRateLimiter } from './rateLimit.middleware';

// Los endpoints públicos de firma verifican un JWT propio (enlace enviado por
// Webex) sin ninguna otra fricción; sin límite de tasa quedan expuestos a
// fuerza bruta sobre el token. 30/min por IP es holgado para uso legítimo
// (un colaborador reintentando el enlace) pero corta un ataque automatizado.
const publicEndpointRateLimit = createRateLimiter({
    windowMs: 60_000,
    max: 30,
    keyPrefix: 'public-signing',
    message: 'Demasiadas solicitudes. Espera un minuto e intenta de nuevo.'
});

/**
 * Guard global del API (RBAC):
 * - Endpoints públicos (login y firmas por enlace con token propio): pasan sin sesión.
 * - El resto exige JWT válido Y usuario activo en BD (la desactivación o el
 *   cambio de permisos surte efecto inmediato, sin esperar a que expire el token).
 * - SUPER_ADMIN: acceso total.
 * - Demás roles: se resuelve (módulo, acción) con el mapa declarativo y se
 *   verifica contra la matriz de permisos en BD. Ruta no mapeada = denegada.
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
    if (isPublic) {
        // El login tiene su propio limitador, más estricto, en auth.routes.ts.
        if (req.path === '/auth/login') return next();
        publicEndpointRateLimit(req, res, next);
        return;
    }

    authenticateJWT(req, res, () => {
        authorizeAgainstDatabase(req, res, next).catch(err => {
            console.error('Error en autorización RBAC:', err);
            res.status(500).json({ error: 'Error interno al validar permisos' });
        });
    });
};

const authorizeAgainstDatabase = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userRepository = new PostgresUserRepository();
    const user = await userRepository.findById(req.user?.id);

    if (!user || !user.isActive) {
        res.status(401).json({ error: 'Tu cuenta está inactiva o ya no existe. Contacta al administrador.' });
        return;
    }

    // Estado fresco desde BD para el resto de la petición (rol vigente, no el del token)
    req.user = { id: user.id, username: user.username, role: user.role, fullName: user.fullName };

    if (user.role === Role.SUPER_ADMIN) return next();

    const rule = resolveRoutePermission(req.method, req.path);
    if (!rule) {
        // Default deny: toda ruta debe estar declarada en permission-map.ts
        res.status(403).json({ error: 'No tienes permisos suficientes para realizar esta acción.' });
        return;
    }

    if (rule.authOnly) return next();

    const permissionRepository = new PostgresPermissionRepository();
    const permissions = await permissionRepository.findByUser(user.id);
    const allowed = (rule.anyOf || []).some(requirement =>
        permissions.some(p => p.moduleKey === requirement.module && p.allows(requirement.action))
    );

    if (allowed) return next();

    res.status(403).json({ error: 'No tienes permisos suficientes para realizar esta acción.' });
};
