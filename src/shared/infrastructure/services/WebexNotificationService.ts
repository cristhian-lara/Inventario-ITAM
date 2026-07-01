import { IMailerService } from '../../contracts/IMailerService';

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

    private async sendMessage(toEmail: string, markdownText: string, documentPath?: string): Promise<void> {
        const normalizedEmail = toEmail.trim().toLowerCase();
        
        if (!this.token) {
            console.log(`\n💬 [SIMULADOR DE WEBEX] Enviando mensaje a: ${normalizedEmail}`);
            console.log(`💬 Mensaje: \n${markdownText}`);
            if (documentPath) console.log(`📎 Archivo adjunto: ${documentPath}\n`);
            return;
        }

        try {
            let requestBody: BodyInit;
            const headers: Record<string, string> = {
                'Authorization': `Bearer ${this.token}`
            };

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
                throw new Error(`Error en Webex API (${response.status}): ${errorData}`);
            }

            console.log(`✅ Mensaje de Webex enviado exitosamente a ${normalizedEmail}`);
        } catch (error) {
            console.error(`❌ Fallo al enviar mensaje de Webex a ${normalizedEmail}:`, error);
        }
    }

    async sendAssignmentEmail(to: string, assignmentId: string, token: string, documentPath?: string): Promise<void> {
        const link = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/assignments/${assignmentId}/accept?token=${token}`;
        const markdown = `**📋 Firma Requerida: Asignación de Activo**\n\nHola, el departamento de TI te ha asignado un nuevo equipo. Por favor, revisa el acta adjunta y luego firma haciendo clic en el siguiente enlace:\n\n👉 [Aceptar Asignación](${link})`;
        await this.sendMessage(to, markdown, documentPath);
    }

    async sendReturnEmail(to: string, assignmentId: string, token: string, documentPath?: string, overrideUrl?: string): Promise<void> {
        const link = overrideUrl || `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/assignments/${assignmentId}/confirm-return?token=${token}`;
        const markdown = `**✅ Firma Requerida: Devolución de Activo (Paz y Salvo)**\n\nHola, TI ha registrado la devolución de tu equipo. Por favor, revisa el paz y salvo adjunto y luego firma haciendo clic en el siguiente enlace:\n\n👉 [Aceptar Paz y Salvo](${link})`;
        await this.sendMessage(to, markdown, documentPath);
    }

    async sendMaintenanceSignatureEmail(to: string, maintenanceId: string, token: string, documentPath?: string): Promise<void> {
        const link = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/maintenance/${maintenanceId}/sign?token=${token}`;
        const markdown = `**🔧 Firma Requerida: Mantenimiento Finalizado**\n\nHola, se ha completado el mantenimiento de uno de tus equipos. Por favor, revisa el acta adjunta y luego firma la conformidad:\n\n👉 [Aceptar Mantenimiento](${link})`;
        await this.sendMessage(to, markdown, documentPath);
    }
}
