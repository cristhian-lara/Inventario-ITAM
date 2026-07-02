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
        const link = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/maintenance/${maintenanceId}/sign?token=${token}`;
        const markdown = `**🔧 Firma Requerida: Mantenimiento Finalizado**\n\nHola, se ha completado el mantenimiento de uno de tus equipos. Por favor, revisa el acta adjunta y luego firma la conformidad:\n\n👉 [Aceptar Mantenimiento](${link})\n\n*⚠️ Importante: Para poder abrir el enlace y firmar el acta, recuerda que debes estar conectado a la red Wi-Fi de la oficina o tener activa tu sesión en la VPN (FortiClient).*`;
        await this.sendMessage(to, markdown, documentPath);
    }

    async sendFinalPdfEmail(to: string, documentPath: string): Promise<void> {
        const markdown = `**✅ Copia de Acta Firmada**\n\nHola, adjuntamos la copia final en PDF de tu acta firmada. ¡Gracias!`;
        await this.sendMessage(to, markdown, documentPath);
    }
}
