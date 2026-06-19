import { AssignmentUseCases } from '../../src/modules/assignment/application/AssignmentUseCases';
import { IAssignmentRepository } from '../../src/modules/assignment/domain/IAssignmentRepository';
import { IMailerService } from '../../src/shared/contracts/IMailerService';
import { Assignment } from '../../src/modules/assignment/domain/Assignment';
import * as jwt from 'jsonwebtoken';

describe('AssignmentUseCases', () => {
    let mockRepository: jest.Mocked<IAssignmentRepository>;
    let mockMailerService: jest.Mocked<IMailerService>;
    let useCases: AssignmentUseCases;

    beforeEach(() => {
        mockRepository = {
            save: jest.fn(),
            findById: jest.fn(),
            findCurrentByAssetId: jest.fn(),
            findActiveByAssetId: jest.fn(),
            findAllActive: jest.fn(),
        };

        mockMailerService = {
            sendAssignmentEmail: jest.fn(),
            sendReturnEmail: jest.fn(),
            sendMaintenanceSignatureEmail: jest.fn(),
        };

        useCases = new AssignmentUseCases(mockRepository, mockMailerService);
    });

    describe('createAssignment', () => {
        it('should create an assignment successfully if asset is available', async () => {
            mockRepository.findCurrentByAssetId.mockResolvedValue(null);

            const result = await useCases.createAssignment('1', 'asset-1', 'collab-1', 'test@ikusi.com', '2026-06-19');

            expect(result).toBeInstanceOf(Assignment);
            expect(result.status).toBe('PENDING_ACCEPTANCE');
            expect(mockRepository.save).toHaveBeenCalled();
            expect(mockMailerService.sendAssignmentEmail).toHaveBeenCalled();
        });

        it('should throw an error if asset is already in PENDING_ACCEPTANCE', async () => {
            mockRepository.findCurrentByAssetId.mockResolvedValue(new Assignment({
                id: '2',
                assetId: 'asset-1',
                collaboratorId: 'collab-1',
                status: 'PENDING_ACCEPTANCE',
                startDate: new Date()
            }));

            await expect(useCases.createAssignment('1', 'asset-1', 'collab-1', 'test@ikusi.com')).rejects.toThrow('Este activo ya está en proceso de asignación (Pendiente de firma).');
        });

        it('should throw an error if asset is already ACCEPTED', async () => {
            mockRepository.findCurrentByAssetId.mockResolvedValue(new Assignment({
                id: '2',
                assetId: 'asset-1',
                collaboratorId: 'collab-1',
                status: 'ACCEPTED',
                startDate: new Date()
            }));

            await expect(useCases.createAssignment('1', 'asset-1', 'collab-1', 'test@ikusi.com')).rejects.toThrow('Este activo ya se encuentra asignado a un colaborador.');
        });
    });

    describe('acceptAssignment', () => {
        it('should accept an assignment successfully', async () => {
            const assignment = new Assignment({
                id: '1',
                assetId: 'asset-1',
                collaboratorId: 'collab-1',
                status: 'PENDING_ACCEPTANCE',
                startDate: new Date()
            });

            const token = assignment.generateToken(() => jwt.sign({ assignmentId: '1' }, 'secret', { expiresIn: '24h' }));
            
            mockRepository.findById.mockResolvedValue(assignment);

            const result = await useCases.acceptAssignment('1', token, '127.0.0.1', 'Mozilla/5.0');

            expect(result.status).toBe('ACCEPTED');
            expect(mockRepository.save).toHaveBeenCalledWith(assignment);
        });

        it('should throw an error if assignment not found', async () => {
            mockRepository.findById.mockResolvedValue(null);
            await expect(useCases.acceptAssignment('1', 'token', '127.0.0.1', 'Mozilla/5.0')).rejects.toThrow('Asignación no encontrada');
        });

        it('should throw an error if token is invalid', async () => {
            const assignment = new Assignment({
                id: '1',
                assetId: 'asset-1',
                collaboratorId: 'collab-1',
                status: 'PENDING_ACCEPTANCE',
                startDate: new Date()
            });
            mockRepository.findById.mockResolvedValue(assignment);

            await expect(useCases.acceptAssignment('1', 'invalid-token', '127.0.0.1', 'Mozilla/5.0')).rejects.toThrow('Token expirado o inválido');
        });
    });

    describe('forceReturn', () => {
        it('should force return an assignment', async () => {
            const assignment = new Assignment({
                id: '1',
                assetId: 'asset-1',
                collaboratorId: 'collab-1',
                status: 'ACCEPTED',
                startDate: new Date()
            });
            mockRepository.findById.mockResolvedValue(assignment);

            const result = await useCases.forceReturn('1', 'Firma forzada');

            expect(result.status).toBe('RETURNED');
            expect(result.signatureMetadata?.userAgent).toBe('ADMIN_CONSOLE');
            expect(mockRepository.save).toHaveBeenCalled();
        });
    });
});
