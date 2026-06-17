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
        const link = `http://localhost:3000/api/assignments/${assignmentId}/accept?token=${token}`;
        
        console.log(`\n📧 [SIMULADOR DE EMAIL] Enviando correo a: ${to}`);
        console.log(`📧 Asunto: Firma requerida para asignación de activo`);
        console.log(`📧 Link mágico: ${link}\n`);

        if (process.env.SMTP_USER) {
            await this.transporter.sendMail({
                from: '"ITAM System" <no-reply@itam.local>',
                to,
                subject: 'Firma requerida para asignación de activo',
                html: `
                    <h1>Nueva Asignación de Activo</h1>
                    <p>Se te ha asignado un nuevo equipo. Por favor, revisa y firma el acta haciendo clic en el siguiente enlace:</p>
                    <a href="${link}" style="padding: 10px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Aceptar Asignación</a>
                `
            });
            console.log(`✅ Correo real enviado a ${to}`);
        }
    }

    async sendReturnEmail(to: string, assignmentId: string, token: string): Promise<void> {
        const link = `http://localhost:3000/api/assignments/${assignmentId}/confirm-return?token=${token}`;
        
        console.log(`\n📧 [SIMULADOR DE EMAIL] Enviando correo a: ${to}`);
        console.log(`📧 Asunto: Firma requerida para devolución de activo (Paz y Salvo)`);
        console.log(`📧 Link mágico: ${link}\n`);

        if (process.env.SMTP_USER) {
            await this.transporter.sendMail({
                from: '"ITAM System" <no-reply@itam.local>',
                to,
                subject: 'Firma requerida para devolución de activo',
                html: `
                    <h1>Paz y Salvo de Activo</h1>
                    <p>Has devuelto tu equipo al área de TI. Por favor, revisa y firma el acta de Paz y Salvo haciendo clic en el siguiente enlace:</p>
                    <a href="${link}" style="padding: 10px; background: #e0a800; color: white; text-decoration: none; border-radius: 5px;">Firmar Devolución</a>
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
