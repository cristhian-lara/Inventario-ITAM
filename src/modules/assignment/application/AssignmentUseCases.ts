import { Assignment } from '../domain/Assignment';
import { IAssignmentRepository } from '../domain/IAssignmentRepository';
import { IMailerService } from '../../../shared/contracts/IMailerService';
import * as jwt from 'jsonwebtoken';

import { IDocumentService } from '../../../shared/contracts/IDocumentService';

export class AssignmentUseCases {
    constructor(
        private readonly repository: IAssignmentRepository,
        private readonly mailerService: IMailerService
    ) {}

    /**
     * Inicia una asignación, genera el JWT de firma y envía el correo.
     */
    async createAssignment(id: string, assetId: string, collaboratorId: string, collaboratorEmail: string, startDate?: string): Promise<Assignment> {
        const existingAssignment = await this.repository.findCurrentByAssetId(assetId);
        
        if (existingAssignment) {
            if (existingAssignment.status === 'PENDING_ACCEPTANCE') {
                throw new Error('Este activo ya está en proceso de asignación (Pendiente de firma).');
            } else if (existingAssignment.status === 'PENDING_RETURN') {
                throw new Error('Este activo está en proceso de devolución (Pendiente de firma).');
            } else {
                throw new Error('Este activo ya se encuentra asignado a un colaborador.');
            }
        }

        const assignment = new Assignment({
            id,
            assetId,
            collaboratorId,
            status: 'PENDING_ACCEPTANCE',
            startDate: startDate ? new Date(startDate) : new Date()
        });

        // La función inyectada para generar el token usa JWT real
        const token = assignment.generateToken((assignId) => {
            const secret = process.env.JWT_SECRET || 'secret';
            return jwt.sign({ assignmentId: assignId }, secret, { expiresIn: '24h' });
        });

        await this.repository.save(assignment);
        await this.mailerService.sendAssignmentEmail(collaboratorEmail, id, token);

        return assignment;
    }

    /**
     * Valida el token y acepta la asignación.
     */
    async acceptAssignment(assignmentId: string, token: string, ipAddress: string, userAgent: string): Promise<Assignment> {
        const assignment = await this.repository.findById(assignmentId);
        if (!assignment) {
            throw new Error('Asignación no encontrada');
        }

        const secret = process.env.JWT_SECRET || 'secret';
        
        try {
            // Verificar expiración y firma
            jwt.verify(token, secret);
        } catch (error) {
            throw new Error('Token expirado o inválido');
        }

        assignment.acceptAssignment(token, {
            ipAddress,
            userAgent,
            timestamp: new Date()
        });

        await this.repository.save(assignment);
        return assignment;
    }

    async updateDocumentPath(assignmentId: string, path: string): Promise<void> {
        const assignment = await this.repository.findById(assignmentId);
        if (assignment) {
            (assignment as any).props.documentPath = path;
            await this.repository.save(assignment);
        }
    }

    async getAllActiveAssignments(): Promise<Assignment[]> {
        return this.repository.findAllActive();
    }

    async initiateReturn(assignmentId: string, collaboratorEmail: string): Promise<Assignment> {
        const assignment = await this.repository.findById(assignmentId);
        if (!assignment) throw new Error('Asignación no encontrada');

        assignment.initiateReturn();

        const secret = process.env.JWT_SECRET || 'secret';
        const token = assignment.generateToken((assignId) => {
            return jwt.sign({ assignmentId: assignId }, secret, { expiresIn: '24h' });
        });

        await this.repository.save(assignment);
        await this.mailerService.sendReturnEmail(collaboratorEmail, assignmentId, token);

        return assignment;
    }

    async initiateReturnByAsset(assetId: string, collaboratorEmail: string): Promise<Assignment> {
        const assignment = await this.repository.findActiveByAssetId(assetId);
        if (!assignment) throw new Error('No se encontró una asignación activa para este activo');
        return this.initiateReturn(assignment.id, collaboratorEmail);
    }

    async confirmReturn(assignmentId: string, token: string, ipAddress: string, userAgent: string): Promise<Assignment> {
        const assignment = await this.repository.findById(assignmentId);
        if (!assignment) throw new Error('Asignación no encontrada');

        const secret = process.env.JWT_SECRET || 'secret';
        try {
            jwt.verify(token, secret);
        } catch (error) {
            throw new Error('Token expirado o inválido');
        }

        assignment.confirmReturn(token, {
            ipAddress,
            userAgent,
            timestamp: new Date()
        });

        await this.repository.save(assignment);
        return assignment;
    }

    async resendLink(assignmentId: string, email: string): Promise<void> {
        const assignment = await this.repository.findById(assignmentId);
        if (!assignment) throw new Error('Asignación no encontrada');
        
        const secret = process.env.JWT_SECRET || 'secret';
        const token = assignment.generateToken((assignId) => {
            return jwt.sign({ assignmentId: assignId }, secret, { expiresIn: '24h' });
        });
        
        await this.repository.save(assignment);
        
        if (assignment.status === 'PENDING_ACCEPTANCE') {
            await this.mailerService.sendAssignmentEmail(email, assignmentId, token);
        } else if (assignment.status === 'PENDING_RETURN') {
            await this.mailerService.sendReturnEmail(email, assignmentId, token);
        } else {
            throw new Error('La asignación no está pendiente de firma');
        }
    }

    async forceReturn(assignmentId: string, ipAddress: string): Promise<Assignment> {
        const assignment = await this.repository.findById(assignmentId);
        if (!assignment) throw new Error('Asignación no encontrada');

        assignment.forceReturn({
            ipAddress,
            userAgent: 'ADMIN_CONSOLE',
            timestamp: new Date()
        });

        await this.repository.save(assignment);
        return assignment;
    }
}
