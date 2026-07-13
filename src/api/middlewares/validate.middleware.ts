import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodType } from 'zod';

/**
 * Valida req.body contra un schema de zod. Devuelve 400 con el detalle de los
 * campos inválidos antes de que la request llegue a la capa de aplicación.
 *
 * El retorno se tipa como RequestHandler<any, any, any, any, any> a propósito:
 * fijar el genérico de parámetros de ruta (P) a ParamsDictionary rompe la
 * inferencia de Express 5 en router.post/put(path, validateBody(...), handler)
 * para paths con `:id` — el handler siguiente termina viendo req.params como
 * `string | string[]` en vez del tipo concreto derivado del path literal.
 * Con P = any, TypeScript conserva el tipo de params inferido del path para
 * el handler que sigue en la cadena.
 */
export function validateBody(schema: ZodType): RequestHandler<any, any, any, any, any> {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({ error: 'Datos inválidos', details: result.error.issues });
            return;
        }
        req.body = result.data;
        next();
    };
}

/**
 * Valida req.query contra un schema de zod, reemplazando los valores parseados
 * (ej. strings numéricas convertidas a number) en req.query.
 */
export function validateQuery(schema: ZodType): RequestHandler<any, any, any, any, any> {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.query);
        if (!result.success) {
            res.status(400).json({ error: 'Parámetros de consulta inválidos', details: result.error.issues });
            return;
        }
        (req as any).validatedQuery = result.data;
        next();
    };
}
