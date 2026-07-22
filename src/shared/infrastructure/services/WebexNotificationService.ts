import { IMailerService } from '../../contracts/IMailerService';
import { NotificationError } from '../../contracts/NotificationError';

import * as fs from 'fs';
import * as path from 'path';

export class WebexNotificationService implements IMailerService {
    private readonly apiUrl = 'https://webexapis.com/v1/messages';
    private readonly token: string;

    constructor() {
        this.token = process.env.WEBEX_BOT_TOKEN || '';
        if (!this.token) {
            console.warn('⚠️ [WebexNotificationService] WEBEX_BOT_TOKEN no configurado en .env. Los mensajes se simularán por consola.');
        }
    }

    /**
     * Consulta la API de People de Webex para saber si la cuenta existe.
     * Devuelve null si no se pudo determinar (error de red, permisos, etc.).
     */
    private async accountExists(email: string): Promise<boolean | null> {
        try {
            const resp = await fetch(`https://webexapis.com/v1/people?email=${encodeURIComponent(email)}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (!resp.ok) return null;
            const data: any = await resp.json();
            return Array.isArray(data.items) && data.items.length > 0;
        } catch {
            return null;
        }
    }

    private async sendMessage(toEmail: string, markdownText: string, documentPath?: string): Promise<void> {
        const normalizedEmail = toEmail.trim().toLowerCase();
        
        if (!this.token) {
            console.log(`\n💬 [SIMULADOR DE WEBEX] Enviando mensaje a: ${normalizedEmail}`);
            console.log(`💬 Mensaje: \n${markdownText}`);
            if (documentPath) console.log(`📎 Archivo adjunto: ${documentPath}\n`);
            return;
        }

        let requestBody: BodyInit;
        const headers: Record<string, string> = {
            'Authorization': `Bearer ${this.token}`
        };

        try {

            const isRelativeUrl = documentPath && documentPath.startsWith('/pdfs/');
            const actualFilePath = isRelativeUrl && documentPath ? path.join(process.cwd(), 'storage', documentPath) : documentPath;

            if (actualFilePath && fs.existsSync(actualFilePath)) {
                // If there's a file, we MUST use multipart/form-data
                const fd = new FormData();
                fd.append('toPersonEmail', normalizedEmail);
                fd.append('markdown', markdownText);
                
                const fileBuffer = fs.readFileSync(actualFilePath);
                const fileName = path.basename(actualFilePath);
                // Creating a standard Blob from the buffer (Node 20+)
                const blob = new Blob([fileBuffer], { type: 'application/pdf' });
                fd.append('files', blob, fileName);
                
                requestBody = fd;
                // Fetch automatically sets the correct Content-Type with the boundary when body is FormData
            } else {
                headers['Content-Type'] = 'application/json';
                requestBody = JSON.stringify({
                    toPersonEmail: normalizedEmail,
                    markdown: markdownText
                });
            }

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers,
                body: requestBody
            });

            if (!response.ok) {
                const errorData = await response.text();

                // Un 400/404 al enviar suele significar destinatario inexistente,
                // pero Webex responde con un genérico "invalid parameter", así que
                // lo confirmamos consultando la API de People.
                if (response.status === 400 || response.status === 404) {
                    const exists = await this.accountExists(normalizedEmail);
                    const looksNotFound = /not found|could not be found|failed to find|verify the email|invalid email/i.test(errorData);
                    if (exists === false || (exists === null && looksNotFound)) {
                        throw new NotificationError(
                            `La cuenta de Webex ${normalizedEmail} no existe.`,
                            'ACCOUNT_NOT_FOUND'
                        );
                    }
                }
                throw new NotificationError(`Error en Webex API (${response.status}): ${errorData}`, 'SEND_FAILED');
            }

            console.log(`✅ Mensaje de Webex enviado exitosamente a ${normalizedEmail}`);
        } catch (error: any) {
            console.error(`❌ Fallo al enviar mensaje de Webex a ${normalizedEmail}:`, error.message || error);
            if (error instanceof NotificationError) throw error;
            // Fallo de red/transporte (sin conexión, DNS, timeout, etc.)
            throw new NotificationError(
                `No se pudo contactar la API de Webex: ${error.message || error}`,
                'SEND_FAILED'
            );
        }
    }

    async sendAssignmentEmail(to: string, assignmentId: string, token: string, documentPath?: string): Promise<void> {
        const link = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/assignments/${assignmentId}/accept?token=${token}`;
        const markdown = `**📋 Firma Requerida: Asignación de Activo**\n\nHola, el departamento de TI te ha asignado un nuevo equipo. Por favor, revisa el acta adjunta y luego firma haciendo clic en el siguiente enlace:\n\n👉 [Aceptar Asignación](${link})\n\n*⚠️ Importante: Para poder abrir el enlace y firmar el acta, recuerda que debes estar conectado a la red Wi-Fi de la oficina o tener activa tu sesión en la VPN (FortiClient).*`;
        await this.sendMessage(to, markdown, documentPath);
    }

    async sendReturnEmail(to: string, assignmentId: string, token: string, documentPath?: string, overrideUrl?: string): Promise<void> {
        const link = overrideUrl || `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/assignments/${assignmentId}/confirm-return?token=${token}`;
        const markdown = `**✅ Firma Requerida: Devolución de Activo (Paz y Salvo)**\n\nHola, TI ha registrado la devolución de tu equipo. Por favor, revisa el paz y salvo adjunto y luego firma haciendo clic en el siguiente enlace:\n\n👉 [Aceptar Paz y Salvo](${link})\n\n*⚠️ Importante: Para poder abrir el enlace y firmar el documento, recuerda que debes estar conectado a la red Wi-Fi de la oficina o tener activa tu sesión en la VPN (FortiClient).*`;
        await this.sendMessage(to, markdown, documentPath);
    }

    async sendMaintenanceSignatureEmail(to: string, maintenanceId: string, token: string, documentPath?: string): Promise<void> {
        // La firma de mantenimiento se hace en la página del frontend (trazo de firma),
        // que valida el token vía /api/maintenances/verify-token y envía POST /sign.
        const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/maintenances/sign/${token}`;
        const markdown = `**🔧 Firma Requerida: Mantenimiento Finalizado**\n\nHola, se ha completado el mantenimiento de uno de tus equipos. Por favor, revisa el acta adjunta y luego firma la conformidad:\n\n👉 [Aceptar Mantenimiento](${link})\n\n*⚠️ Importante: Para poder abrir el enlace y firmar el acta, recuerda que debes estar conectado a la red Wi-Fi de la oficina o tener activa tu sesión en la VPN (FortiClient).*`;
        await this.sendMessage(to, markdown, documentPath);
    }

    /**
     * Recordatorio de mantenimiento próximo, disparado manualmente por el administrador.
     */
    async sendMaintenanceReminder(to: string, info: { assetId: string; hostname?: string; type: string; scheduledDate: Date | string; reason?: string }): Promise<void> {
        const dateStr = typeof info.scheduledDate === 'string'
            ? info.scheduledDate.split('T')[0].split('-').reverse().join('/')
            : info.scheduledDate.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
        const typeStr = info.type === 'PREVENTIVE' ? 'Preventivo' : 'Correctivo';
        const equipo = info.hostname ? `${info.assetId} (${info.hostname})` : info.assetId;
        const markdown = `**🔔 Recordatorio: Mantenimiento Programado**\n\nHola, el departamento de TI te recuerda que tu equipo **${equipo}** tiene un mantenimiento **${typeStr}** programado para el **${dateStr}**.${info.reason ? `\n\n📋 Motivo: ${info.reason}` : ''}\n\nPor favor, ten el equipo disponible en la fecha indicada y respalda tu información importante con anticipación.`;
        await this.sendMessage(to, markdown);
    }

    async sendFinalPdfEmail(to: string, documentPath: string): Promise<void> {
        const markdown = `**✅ Copia de Acta Firmada**\n\nHola, adjuntamos la copia final en PDF de tu acta firmada. ¡Gracias!`;
        await this.sendMessage(to, markdown, documentPath);
    }

    /**
     * Copia informativa (no requiere firma del colaborador) del acta de un mantenimiento
     * preventivo realizado por TI antes de entregar el equipo. Se envía a la persona a la
     * que se le está asignando el computador.
     */
    async sendPreAssignmentMaintenanceInfoEmail(to: string, documentPath: string): Promise<void> {
        const markdown = `**🛠️ Mantenimiento Preventivo Previo a la Asignación**\n\nHola, antes de entregarte el equipo, TI realizó un mantenimiento preventivo (limpieza y revisión general). Adjuntamos el acta correspondiente, firmada por TI, a modo informativo.`;
        await this.sendMessage(to, markdown, documentPath);
    }

    /**
     * Digest diario a un administrador con TODOS los préstamos que están a
     * `alertThresholdDays` días de vencer o ya vencidos. Disparado por el job
     * de alertas (no por acción manual de un usuario).
     */
    async sendLoanExpiryDigest(
        to: string,
        items: Array<{ assetId: string; hostname?: string; collaboratorName: string; expectedReturnDate: Date | string; daysLeft: number }>,
        alertThresholdDays: number
    ): Promise<void> {
        const lines = [...items]
            .sort((a, b) => a.daysLeft - b.daysLeft)
            .map(item => {
                const dateStr = typeof item.expectedReturnDate === 'string'
                    ? item.expectedReturnDate.split('T')[0].split('-').reverse().join('/')
                    : item.expectedReturnDate.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
                const equipo = item.hostname ? `${item.assetId} (${item.hostname})` : item.assetId;
                const abs = Math.abs(item.daysLeft);
                const estado = item.daysLeft < 0
                    ? `🔴 Vencido hace ${abs} día${abs === 1 ? '' : 's'}`
                    : item.daysLeft === 0
                        ? `🟠 Vence HOY`
                        : `🟡 Vence en ${abs} día${abs === 1 ? '' : 's'}`;
                return `- **${equipo}** — Colaborador: ${item.collaboratorName} — Devolución esperada: ${dateStr} (${estado})`;
            })
            .join('\n');

        const markdown = `**📦 Préstamos de Equipos Próximos a Vencer**\n\nHola, este es el resumen diario de préstamos que requieren atención (a ${alertThresholdDays} días o menos de su devolución, o ya vencidos):\n\n${lines}\n\nGestiona la devolución o extiende la fecha desde el Catálogo de Activos. Este aviso se repetirá a diario hasta que el equipo sea devuelto o se extienda su fecha.`;
        await this.sendMessage(to, markdown);
    }

    /**
     * Digest diario a un administrador con TODOS los mantenimientos programados que están a
     * `alertThresholdDays` días de vencer o ya vencidos. Disparado por el job de alertas de
     * mantenimiento (no por acción manual de un usuario).
     */
    async sendMaintenanceExpiryDigest(
        to: string,
        items: Array<{ assetId: string; hostname?: string; type: string; scheduledDate: Date | string; daysLeft: number }>,
        alertThresholdDays: number
    ): Promise<void> {
        const lines = [...items]
            .sort((a, b) => a.daysLeft - b.daysLeft)
            .map(item => {
                const dateStr = typeof item.scheduledDate === 'string'
                    ? item.scheduledDate.split('T')[0].split('-').reverse().join('/')
                    : item.scheduledDate.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
                const equipo = item.hostname ? `${item.assetId} (${item.hostname})` : item.assetId;
                const typeStr = item.type === 'PREVENTIVE' ? 'Preventivo' : 'Correctivo';
                const abs = Math.abs(item.daysLeft);
                const estado = item.daysLeft < 0
                    ? `🔴 Vencido hace ${abs} día${abs === 1 ? '' : 's'}`
                    : item.daysLeft === 0
                        ? `🟠 Vence HOY`
                        : `🟡 Vence en ${abs} día${abs === 1 ? '' : 's'}`;
                return `- **${equipo}** — Tipo: ${typeStr} — Fecha programada: ${dateStr} (${estado})`;
            })
            .join('\n');

        const markdown = `**🔧 Mantenimientos Próximos a Vencer**\n\nHola, este es el resumen diario de mantenimientos que requieren atención (a ${alertThresholdDays} días o menos de su fecha programada, o ya vencidos):\n\n${lines}\n\nGestiona el inicio o cierre del mantenimiento desde el Dashboard de Mantenimientos. Este aviso se repetirá a diario hasta que el mantenimiento sea iniciado o completado.`;
        await this.sendMessage(to, markdown);
    }
}
