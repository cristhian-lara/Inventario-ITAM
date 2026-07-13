import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
    count: number;
    windowStart: number;
}

interface RateLimitOptions {
    windowMs: number;
    max: number;
    message: string;
    /** Prefijo para distinguir buckets de distintos limitadores que comparten IP. */
    keyPrefix: string;
}

/**
 * Limitador de tasa simple en memoria, por IP. Adecuado para una única
 * instancia de proceso (no distribuido); si se despliega en cluster/PM2 cada
 * proceso lleva su propio conteo.
 *
 * Todas las instancias creadas comparten un único Map y un único intervalo de
 * limpieza para evitar registrar un setInterval por cada limitador.
 */
const buckets = new Map<string, RateLimitEntry>();

let cleanupTimer: NodeJS.Timeout | null = null;
const MAX_ENTRY_AGE_MS = 10 * 60_000;

function ensureCleanupScheduled() {
    if (cleanupTimer) return;
    cleanupTimer = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of buckets) {
            if (now - entry.windowStart > MAX_ENTRY_AGE_MS) buckets.delete(key);
        }
    }, MAX_ENTRY_AGE_MS);
    cleanupTimer.unref?.();
}

export function createRateLimiter(options: RateLimitOptions) {
    ensureCleanupScheduled();
    return (req: Request, res: Response, next: NextFunction) => {
        const ip = req.ip || req.socket?.remoteAddress || 'unknown';
        const key = `${options.keyPrefix}:${ip}`;
        const now = Date.now();
        const entry = buckets.get(key);

        if (!entry || now - entry.windowStart > options.windowMs) {
            buckets.set(key, { count: 1, windowStart: now });
            return next();
        }
        entry.count++;
        if (entry.count > options.max) {
            return res.status(429).json({ error: options.message });
        }
        next();
    };
}
