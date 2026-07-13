import { PermissionAction } from '../../modules/auth/domain/UserPermission';

/**
 * Mapa declarativo ruta → (módulo, acción) del esquema RBAC.
 *
 * Cada entrada indica qué permiso habilita el endpoint. `anyOf` es una lista
 * de alternativas: basta con tener UNO de los permisos listados (se usa en
 * lecturas de datos de apoyo que varias pantallas comparten, p. ej. la lista
 * de equipos que necesitan Mantenimientos, Colaboradores y Dashboard).
 *
 * `authOnly` marca endpoints disponibles para cualquier usuario autenticado
 * activo, sin permiso de módulo (p. ej. cambiar la contraseña propia).
 *
 * Las rutas se evalúan en orden y la primera coincidencia gana.
 * Ruta no mapeada = acceso denegado (default deny).
 *
 * Claves de módulo (tabla system_modules): dashboard, assets, collaborators,
 * maintenances, actas, settings, users.
 */

export interface PermissionRequirement {
    module: string;
    action: PermissionAction;
}

export interface RoutePermission {
    method: string; // GET cubre también HEAD
    pattern: RegExp; // sobre req.path relativo a /api
    anyOf?: PermissionRequirement[];
    authOnly?: boolean;
}

const req = (module: string, action: PermissionAction): PermissionRequirement => ({ module, action });
const anyRead = (...modules: string[]): PermissionRequirement[] => modules.map(m => req(m, 'read'));

export const ROUTE_PERMISSIONS: RoutePermission[] = [
    // ── Auth (cualquier usuario autenticado activo) ─────────────────────────
    { method: 'GET', pattern: /^\/auth\/me$/, authOnly: true },
    { method: 'POST', pattern: /^\/auth\/change-password$/, authOnly: true },
    { method: 'POST', pattern: /^\/auth\/logout$/, authOnly: true },

    // ── Usuarios ────────────────────────────────────────────────────────────
    { method: 'GET', pattern: /^\/users\/modules$/, anyOf: [req('users', 'read')] },
    { method: 'GET', pattern: /^\/users/, anyOf: [req('users', 'read')] },
    { method: 'POST', pattern: /^\/users\/[^/]+\/reset-password$/, anyOf: [req('users', 'edit')] },
    { method: 'POST', pattern: /^\/users$/, anyOf: [req('users', 'create')] },
    { method: 'PUT', pattern: /^\/users\/[^/]+\/permissions$/, anyOf: [req('users', 'edit')] },
    { method: 'PUT', pattern: /^\/users\/[^/]+$/, anyOf: [req('users', 'edit')] },
    { method: 'PATCH', pattern: /^\/users\/[^/]+\/status$/, anyOf: [req('users', 'edit')] },
    { method: 'DELETE', pattern: /^\/users\/[^/]+$/, anyOf: [req('users', 'delete')] },

    // ── Dashboard ───────────────────────────────────────────────────────────
    { method: 'GET', pattern: /^\/dashboard/, anyOf: [req('dashboard', 'read')] },

    // ── Catálogo: categorías (se administran en Configuración; las leen
    //    varias pantallas como dato de apoyo) ─────────────────────────────────
    { method: 'GET', pattern: /^\/catalog\/categories/, anyOf: anyRead('settings', 'assets', 'collaborators', 'maintenances', 'dashboard') },
    { method: 'POST', pattern: /^\/catalog\/categories$/, anyOf: [req('settings', 'create')] },
    { method: 'PUT', pattern: /^\/catalog\/categories\/[^/]+$/, anyOf: [req('settings', 'edit')] },

    // ── Catálogo: equipos ───────────────────────────────────────────────────
    { method: 'GET', pattern: /^\/catalog\/assets\/[^/]+\/upgrades$/, anyOf: anyRead('assets') },
    { method: 'POST', pattern: /^\/catalog\/assets\/[^/]+\/upgrades$/, anyOf: [req('assets', 'edit')] },
    { method: 'POST', pattern: /^\/catalog\/assets\/import$/, anyOf: [req('assets', 'create')] },
    { method: 'POST', pattern: /^\/catalog\/assets\/[^/]+\/decommission$/, anyOf: [req('assets', 'delete')] },
    { method: 'PUT', pattern: /^\/catalog\/assets\/[^/]+\/status$/, anyOf: [req('assets', 'edit')] },
    { method: 'POST', pattern: /^\/catalog\/assets$/, anyOf: [req('assets', 'create')] },
    { method: 'PUT', pattern: /^\/catalog\/assets\/[^/]+$/, anyOf: [req('assets', 'edit')] },
    { method: 'GET', pattern: /^\/catalog\/assets/, anyOf: anyRead('assets', 'collaborators', 'maintenances', 'dashboard') },

    // ── Colaboradores: departamentos y CECOS (se administran en Configuración) ─
    { method: 'GET', pattern: /^\/collaborators\/(departments|cecos)/, anyOf: anyRead('settings', 'collaborators', 'dashboard') },
    { method: 'POST', pattern: /^\/collaborators\/(departments|cecos)$/, anyOf: [req('settings', 'create')] },
    { method: 'PUT', pattern: /^\/collaborators\/(departments|cecos)\/[^/]+$/, anyOf: [req('settings', 'edit')] },

    // ── Colaboradores ───────────────────────────────────────────────────────
    { method: 'POST', pattern: /^\/collaborators\/import$/, anyOf: [req('collaborators', 'create')] },
    { method: 'POST', pattern: /^\/collaborators$/, anyOf: [req('collaborators', 'create')] },
    { method: 'PATCH', pattern: /^\/collaborators\/[^/]+\/toggle-status$/, anyOf: [req('collaborators', 'edit')] },
    { method: 'PUT', pattern: /^\/collaborators\/[^/]+$/, anyOf: [req('collaborators', 'edit')] },
    { method: 'GET', pattern: /^\/collaborators/, anyOf: anyRead('collaborators', 'assets', 'maintenances', 'dashboard') },

    // ── Asignaciones (transversales: se operan desde Colaboradores y Catálogo;
    //    editar cualquiera de esos módulos habilita entregas/devoluciones) ────
    { method: 'POST', pattern: /^\/assignments($|\/)/, anyOf: [req('collaborators', 'edit'), req('assets', 'edit')] },
    { method: 'GET', pattern: /^\/assignments/, anyOf: anyRead('collaborators', 'assets', 'actas', 'maintenances', 'dashboard') },

    // ── Mantenimientos ──────────────────────────────────────────────────────
    { method: 'POST', pattern: /^\/maintenances$/, anyOf: [req('maintenances', 'create')] },
    { method: 'POST', pattern: /^\/maintenances\//, anyOf: [req('maintenances', 'edit')] },
    { method: 'GET', pattern: /^\/maintenances/, anyOf: anyRead('maintenances', 'assets', 'dashboard') },

    // ── Actas (documentos) ──────────────────────────────────────────────────
    { method: 'GET', pattern: /^\/documents/, anyOf: anyRead('actas') },

    // ── Configuración (plantillas y ajustes) ────────────────────────────────
    { method: 'GET', pattern: /^\/settings/, anyOf: anyRead('settings') },
    { method: 'PUT', pattern: /^\/settings/, anyOf: [req('settings', 'edit')] },
];

/** Resuelve la primera regla que aplica al método+ruta. HEAD se trata como GET. */
export const resolveRoutePermission = (method: string, path: string): RoutePermission | undefined => {
    const normalizedMethod = method === 'HEAD' ? 'GET' : method;
    return ROUTE_PERMISSIONS.find(entry => entry.method === normalizedMethod && entry.pattern.test(path));
};
