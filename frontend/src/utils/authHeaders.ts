/**
 * Cabeceras de autenticación para llamadas con fetch().
 * (Las llamadas con axios ya llevan el token vía defaults en AuthContext.)
 */
export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const token = localStorage.getItem('token');
    return {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'ngrok-skip-browser-warning': '69420',
        ...extra,
    };
}
