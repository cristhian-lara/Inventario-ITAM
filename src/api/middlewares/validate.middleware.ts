import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

/**
 * Valida req.body contra un schema de zod. Devuelve 400 con el detalle de los
 * campos inválidos antes de que la request llegue a la capa de aplicación.
 */
export function validateBody(schema: ZodType) {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: 'Datos inválidos', details: result.error.issues });
        }
        req.body = result.data;
        next();
    };
}

/**
 * Valida req.query contra un schema de zod, reemplazando los valores parseados
 * (ej. strings numéricas convertidas a number) en req.query.
 */
export function validateQuery(schema: ZodType) {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.query);
        if (!result.success) {
            return res.status(400).json({ error: 'Parámetros de consulta inválidos', details: result.error.issues });
        }
        (req as any).validatedQuery = result.data;
        next();
    };
}
