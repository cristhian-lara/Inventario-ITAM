import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { IMailerService } from '../../contracts/IMailerService';

export class NodemailerService implements IMailerService {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.ethereal.email',
            port: parseInt(process.env.SMTP_PORT || '587'),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    /**
     * Convierte un documentPath relativo (ej. /pdfs/acta.pdf) en un adjunto de Nodemailer
     * si el archivo existe físicamente en la carpeta storage. Devuelve [] si no aplica.
     */
    private buildAttachments(documentPath?: string, filename = 'acta.pdf'): nodemailer.SendMailOptions['attachments'] {
        if (!documentPath) return [];
        const absolutePath = path.join(process.cwd(), 'storage', documentPath);
        if (!fs.existsSync(absolutePath)) {
            console.warn(`⚠️ [NodemailerService] No se encontró el PDF para adjuntar: ${absolutePath}`);
            return [];
        }
        return [{ filename, path: absolutePath }];
    }

    /**
     * Envía el correo. Si SMTP no está configurado, simula por consola.
     * Cualquier fallo real de transporte se propaga (throw) para que el llamador lo maneje.
     */
    private async send(options: nodemailer.SendMailOptions & { magicLink?: string }): Promise<void> {
        const { magicLink, ...mailOptions } = options;
        console.log(`\n📧 [EMAIL] Para: ${mailOptions.to}`);
        console.log(`📧 Asunto: ${mailOptions.subject}`);
        if (magicLink) console.log(`🔗 Link de firma: ${magicLink}`);

        if (!process.env.SMTP_USER) {
            console.log('ℹ️ SMTP_USER no configurado: correo simulado (no enviado).\n');
            return;
        }

        await this.transporter.sendMail(mailOptions);
        console.log(`✅ Correo enviado a ${mailOptions.to}\n`);
    }

    async sendAssignmentEmail(to: string, assignmentId: string, token: string, documentPath?: string): Promise<void> {
        const link = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/assignments/${assignmentId}/accept?token=${token}`;
        await this.send({
            magicLink: link,
            from: '"Ikusi IT" <no-reply@ikusi.com>',
            to,
            subject: 'Firma requerida para asignación de activo',
            attachments: this.buildAttachments(documentPath, 'acta_asignacion.pdf'),
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                    <img src="https://www.ikusi.com/mx/wp-content/uploads/sites/2/2020/09/ikusi-velatia-logo.png" alt="Ikusi Logo" style="width: 150px; margin-bottom: 20px;">
                    <h2 style="color: #333; border-bottom: 2px solid #e3000f; padding-bottom: 10px;">Nueva Asignación de Activo</h2>
                    <p style="color: #555; font-size: 16px;">Hola,</p>
                    <p style="color: #555; font-size: 16px;">Se te ha asignado un nuevo equipo por parte del área de TI. Por favor, revisa el acta adjunta y firma tu conformidad ingresando al siguiente enlace:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${link}" style="background-color: #e3000f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Firmar Asignación</a>
                    </div>
                    <p style="color: #888; font-size: 12px; text-align: center;">Este enlace es único, seguro y expira en 24 horas.</p>
                </div>
            `
        });
    }

    async sendReturnEmail(to: string, assignmentId: string, token: string, documentPath?: string, overrideUrl?: string): Promise<void> {
        const link = overrideUrl || `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/assignments/${assignmentId}/confirm-return?token=${token}`;
        await this.send({
            magicLink: link,
            from: '"Ikusi IT" <no-reply@ikusi.com>',
            to,
            subject: 'Firma requerida para devolución de activo (Paz y Salvo)',
            attachments: this.buildAttachments(documentPath, 'paz_y_salvo.pdf'),
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                    <img src="https://www.ikusi.com/mx/wp-content/uploads/sites/2/2020/09/ikusi-velatia-logo.png" alt="Ikusi Logo" style="width: 150px; margin-bottom: 20px;">
                    <h2 style="color: #333; border-bottom: 2px solid #e3000f; padding-bottom: 10px;">Paz y Salvo de Activo</h2>
                    <p style="color: #555; font-size: 16px;">Hola,</p>
                    <p style="color: #555; font-size: 16px;">Has devuelto un equipo al área de TI. Por favor, revisa y firma el acta de Paz y Salvo correspondiente ingresando al siguiente enlace:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${link}" style="background-color: #e3000f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Firmar Devolución</a>
                    </div>
                    <p style="color: #888; font-size: 12px; text-align: center;">Este enlace es único, seguro y expira en 24 horas.</p>
                </div>
            `
        });
    }

    async sendMaintenanceSignatureEmail(to: string, maintenanceId: string, token: string, documentPath?: string): Promise<void> {
        const signUrl = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/maintenances/accept?token=${token}`;
        await this.send({
            magicLink: signUrl,
            from: '"Ikusi IT" <no-reply@ikusi.com>',
            to,
            subject: 'Requerido: Firma Acta de Mantenimiento Ikusi',
            attachments: this.buildAttachments(documentPath, 'acta_mantenimiento.pdf'),
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <img src="https://www.ikusi.com/mx/wp-content/uploads/sites/2/2020/09/ikusi-velatia-logo.png" alt="Ikusi Logo" style="width: 150px; margin-bottom: 20px;">
                    <h2 style="color: #333;">Firma de Acta de Mantenimiento</h2>
                    <p>Hola,</p>
                    <p>Tu equipo ha finalizado su servicio de mantenimiento técnico. Por favor, revisa el acta y firma tu conformidad ingresando al siguiente enlace:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${signUrl}" style="background-color: #004b87; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Firmar Acta de Mantenimiento</a>
                    </div>
                    <p style="color: #666; font-size: 14px;">Este enlace es seguro y expirará en 24 horas.</p>
                </div>
            `
        });
    }

    async sendFinalPdfEmail(to: string, documentPath: string): Promise<void> {
        await this.send({
            from: '"Ikusi IT" <no-reply@ikusi.com>',
            to,
            subject: 'Copia de Acta Firmada',
            attachments: this.buildAttachments(documentPath, 'acta_firmada.pdf'),
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Acta Firmada</h2>
                    <p>Adjuntamos la copia final de tu acta firmada en formato PDF.</p>
                </div>
            `
        });
    }
}
