/**
 * Versión del sistema — fuente única de verdad para el frontend.
 *
 * Convención SemVer (MAYOR.MENOR.PARCHE):
 * - MAYOR: cambios incompatibles o rediseños de módulos completos.
 * - MENOR: nuevas funcionalidades o mejoras (ej. nuevo módulo, nueva condición de negocio).
 * - PARCHE: correcciones de bugs sin funcionalidad nueva.
 *
 * Al publicar cambios: incrementa APP_VERSION y agrega una entrada al inicio de CHANGELOG.
 */
export const APP_VERSION = '1.1.0';

export interface ChangelogEntry {
    version: string;
    date: string; // YYYY-MM-DD
    changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
    {
        version: '1.1.0',
        date: '2026-07-02',
        changes: [
            'Actas con la fecha real de asignación registrada (no la fecha de firma).',
            'Corrección de corrimiento de un día en fechas (zona horaria Bogotá).',
            'Actas de devolución: "Paz y Salvo" solo al devolver todos los activos; "Devolución" si es parcial.',
            'Nueva nomenclatura de PDFs: Asignación/Devolución/Paz y Salvo/Mantenimiento + Nombre.',
            'Menú de acciones (3 puntos) se despliega hacia arriba al final de la página.',
            'Precio de compra visible en la hoja de vida y persistido al crear equipos (depreciación).',
            'Notificaciones por Webex con aviso claro cuando la cuenta no existe; el enlace de firma no se pierde.',
            'Rol Visualizador (auditores): acceso de solo lectura a Actas y Mantenimientos.',
            'Hoja de vida: valor de compra visible aunque el dato venga de la importación (atributos dinámicos).',
            'Responsive: tablas con scroll propio en pantallas pequeñas y menú móvil con cierre de sesión visible.',
        ],
    },
    {
        version: '1.0.0',
        date: '2026-06-19',
        changes: [
            'Versión base: dashboard, catálogo, colaboradores, asignaciones con firma digital, mantenimientos y gestor de actas.',
        ],
    },
];
