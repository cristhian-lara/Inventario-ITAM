export type NotificationFailureReason = 'ACCOUNT_NOT_FOUND' | 'SEND_FAILED';

/** Resultado de un intento de notificación que no interrumpe el flujo. */
export interface NotificationResult {
    sent: boolean;
    accountNotFound: boolean;
    error?: string;
}

/**
 * Error tipado para fallos de notificación (Webex, correo, etc.).
 * Permite a las rutas distinguir "la cuenta no existe" de un fallo genérico
 * de envío (sin red, API caída, etc.) y responder al frontend en consecuencia.
 */
export class NotificationError extends Error {
    constructor(message: string, public readonly reason: NotificationFailureReason) {
        super(message);
        this.name = 'NotificationError';
    }
}
