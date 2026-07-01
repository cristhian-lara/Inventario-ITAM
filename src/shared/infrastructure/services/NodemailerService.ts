import * as nodemailer from 'nodemailer';
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

    async sendAssignmentEmail(to: string, assignmentId: string, token: string): Promise<void> {
        const link = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/assignments/${assignmentId}/accept?token=${token}`;
        
        console.log(`\n📧 [SIMULADOR DE EMAIL] Enviando correo a: ${to}`);
        console.log(`📧 Asunto: Firma requerida para asignación de activo`);
        console.log(`📧 Link mágico: ${link}\n`);

        if (process.env.SMTP_USER) {
            await this.transporter.sendMail({
                from: '"ITAM System" <no-reply@itam.local>',
                to,
                subject: 'Firma requerida para asignación de activo',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                        <img src="https://www.ikusi.com/mx/wp-content/uploads/sites/2/2020/09/ikusi-velatia-logo.png" alt="Ikusi Logo" style="width: 150px; margin-bottom: 20px;">
                        <h2 style="color: #333; border-bottom: 2px solid #e3000f; padding-bottom: 10px;">Nueva Asignación de Activo</h2>
                        <p style="color: #555; font-size: 16px;">Hola,</p>
                        <p style="color: #555; font-size: 16px;">Se te ha asignado un nuevo equipo por parte del área de TI. Por favor, revisa el acta adjunta y firma tu conformidad ingresando al siguiente enlace:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${link}" style="background-color: #e3000f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Firmar Asignación</a>
                        </div>
                        <p style="color: #888; font-size: 12px; text-align: center;">Este enlace es único y seguro.</p>
                    </div>
                `
            });
            console.log(`✅ Correo real enviado a ${to}`);
        }
    }

    async sendReturnEmail(to: string, assignmentId: string, token: string, documentPath?: string, overrideUrl?: string): Promise<void> {
        const link = overrideUrl || `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/assignments/${assignmentId}/confirm-return?token=${token}`;
        
        console.log(`\n📧 [SIMULADOR DE EMAIL] Enviando correo a: ${to}`);
        console.log(`📧 Asunto: Firma requerida para devolución de activo (Paz y Salvo)`);
        console.log(`📧 Link mágico: ${link}\n`);

        if (process.env.SMTP_USER) {
            await this.transporter.sendMail({
                from: '"ITAM System" <no-reply@itam.local>',
                to,
                subject: 'Firma requerida para devolución de activo',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                        <img src="https://www.ikusi.com/mx/wp-content/uploads/sites/2/2020/09/ikusi-velatia-logo.png" alt="Ikusi Logo" style="width: 150px; margin-bottom: 20px;">
                        <h2 style="color: #333; border-bottom: 2px solid #e3000f; padding-bottom: 10px;">Paz y Salvo de Activo</h2>
                        <p style="color: #555; font-size: 16px;">Hola,</p>
                        <p style="color: #555; font-size: 16px;">Has devuelto un equipo al área de TI. Por favor, revisa y firma el acta de Paz y Salvo correspondiente ingresando al siguiente enlace:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${link}" style="background-color: #e3000f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Firmar Devolución</a>
                        </div>
                        <p style="color: #888; font-size: 12px; text-align: center;">Este enlace es único y seguro.</p>
                    </div>
                `
            });
            console.log(`✅ Correo real enviado a ${to}`);
        }
    }

    async sendMaintenanceSignatureEmail(to: string, maintenanceId: string, token: string): Promise<void> {
        const signUrl = `http://localhost:3000/api/maintenances/accept?token=${token}`;
        
        console.log(`\n📧 [SIMULADOR DE EMAIL] Enviando correo a: ${to}`);
        console.log(`📧 Asunto: Requerido: Firma Acta de Mantenimiento Ikusi`);
        console.log(`📧 Link mágico: ${signUrl}\n`);

        if (process.env.SMTP_USER) {
            await this.transporter.sendMail({
                from: '"Ikusi IT" <noreply@ikusi.com>',
                to,
                subject: 'Requerido: Firma Acta de Mantenimiento Ikusi',
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
            console.log(`✅ Correo real enviado a ${to}`);
        }
    }
}
