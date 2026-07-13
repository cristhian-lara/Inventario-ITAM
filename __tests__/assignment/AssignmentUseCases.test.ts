import { AssignmentUseCases } from '../../src/modules/assignment/application/AssignmentUseCases';
import { IAssignmentRepository } from '../../src/modules/assignment/domain/IAssignmentRepository';
import { IMailerService } from '../../src/shared/contracts/IMailerService';
import { Assignment } from '../../src/modules/assignment/domain/Assignment';
import * as jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('AssignmentUseCases', () => {
    let useCases: AssignmentUseCases;
    let mockRepo: jest.Mocked<IAssignmentRepository>;
    let mockMailer: jest.Mocked<IMailerService>;

    beforeEach(() => {
        mockRepo = {
            save: jest.fn(),
            findById: jest.fn(),
            findByIds: jest.fn(),
            findAllActive: jest.fn(),
            findActiveByAssetId: jest.fn(),
            findCurrentByAssetId: jest.fn(),
            findLoansDueWithinDays: jest.fn(),
        };

        mockMailer = {
            sendAssignmentEmail: jest.fn(),
            sendReturnEmail: jest.fn(),
            sendMaintenanceSignatureEmail: jest.fn(),
            sendFinalPdfEmail: jest.fn(),
        };

        (jwt.sign as jest.Mock).mockReturnValue('mock-token');
        (jwt.verify as jest.Mock).mockReturnValue({});

        useCases = new AssignmentUseCases(mockRepo, mockMailer);
    });

    describe('createAssignment', () => {
        it('should throw an error if asset is already assigned', async () => {
            const existing = new Assignment({ id: '1', assetId: 'a1', collaboratorId: 'c1', status: 'ACCEPTED', startDate: new Date() });
            mockRepo.findCurrentByAssetId.mockResolvedValue(existing);

            await expect(useCases.createAssignment('2', 'a1', 'c2', 'test@ikusi.com')).rejects.toThrow('Este activo ya se encuentra asignado a un colaborador.');
        });

        it('should create an assignment and send email successfully', async () => {
            mockRepo.findCurrentByAssetId.mockResolvedValue(null);

            const { assignment } = await useCases.createAssignment('1', 'a1', 'c1', 'test@ikusi.com');

            expect(assignment.id).toBe('1');
            expect(assignment.status).toBe('PENDING_ACCEPTANCE');
            expect(mockRepo.save).toHaveBeenCalledTimes(1);
            // El envío de correo se movió a la capa de rutas; el use case solo persiste y devuelve el token.
            expect(mockMailer.sendAssignmentEmail).not.toHaveBeenCalled();
        });
    });

    describe('acceptAssignment', () => {
        it('should throw an error if assignment not found', async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(useCases.acceptAssignment('1', 'token', '127.0.0.1', 'Agent')).rejects.toThrow('Asignación no encontrada');
        });

        it('should throw an error if token is invalid', async () => {
            const assignment = new Assignment({ id: '1', assetId: 'a1', collaboratorId: 'c1', status: 'PENDING_ACCEPTANCE', startDate: new Date() });
            mockRepo.findById.mockResolvedValue(assignment);
            (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error('Invalid'); });

            await expect(useCases.acceptAssignment('1', 'token', '127.0.0.1', 'Agent')).rejects.toThrow('Token expirado o inválido');
        });

        it('should accept the assignment', async () => {
            const assignment = new Assignment({ id: '1', assetId: 'a1', collaboratorId: 'c1', status: 'PENDING_ACCEPTANCE', startDate: new Date(), signatureToken: 'token' });
            mockRepo.findById.mockResolvedValue(assignment);

            await useCases.acceptAssignment('1', 'token', '127.0.0.1', 'Agent');

            expect(assignment.status).toBe('ACCEPTED');
            expect(mockRepo.save).toHaveBeenCalledWith(assignment);
        });
    });

    describe('initiateReturn', () => {
        it('should initiate return', async () => {
            const assignment = new Assignment({ id: '1', assetId: 'a1', collaboratorId: 'c1', status: 'ACCEPTED', startDate: new Date() });
            mockRepo.findById.mockResolvedValue(assignment);

            await useCases.initiateReturn('1', 'test@ikusi.com');

            expect(assignment.status).toBe('PENDING_RETURN');
            expect(mockRepo.save).toHaveBeenCalledWith(assignment);
            // El envío de correo se movió a la capa de rutas; el use case solo persiste y devuelve el token.
            expect(mockMailer.sendReturnEmail).not.toHaveBeenCalled();
        });
    });
});
