import { MaintenanceUseCases } from '../../src/modules/maintenance/application/MaintenanceUseCases';
import { IMaintenanceRepository } from '../../src/modules/maintenance/domain/IMaintenanceRepository';
import { MaintenanceRecord } from '../../src/modules/maintenance/domain/MaintenanceRecord';
import { IMailerService } from '../../src/shared/contracts/IMailerService';

describe('MaintenanceUseCases', () => {
    let mockRepository: jest.Mocked<IMaintenanceRepository>;
    let mockAssignmentAdapter: any;
    let mockMailerService: jest.Mocked<IMailerService>;
    let useCases: MaintenanceUseCases;

    beforeEach(() => {
        mockRepository = {
            save: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
            findByAssetId: jest.fn().mockResolvedValue([]),
        } as any;

        mockAssignmentAdapter = {
            getActiveAssignmentForAsset: jest.fn(),
        };

        mockMailerService = {
            sendAssignmentEmail: jest.fn(),
            sendReturnEmail: jest.fn(),
            sendMaintenanceSignatureEmail: jest.fn(),
        };

        useCases = new MaintenanceUseCases(mockRepository, mockAssignmentAdapter, mockMailerService);
    });

    describe('createManualMaintenance', () => {
        it('should create a maintenance record successfully', async () => {
            mockAssignmentAdapter.getActiveAssignmentForAsset.mockResolvedValue({
                collaboratorId: 'collab-1',
                collaboratorName: 'John Doe',
                collaboratorEmail: 'john@example.com'
            });

            const payload = {
                assetId: 'asset-1',
                type: 'PREVENTIVE' as const,
                scheduledDate: new Date('2026-06-25'),
                reason: 'Routine check'
            };

            const result = await useCases.createManualMaintenance(payload);

            expect(result).toBeInstanceOf(MaintenanceRecord);
            expect(result.status).toBe('SCHEDULED');
            expect(result.collaboratorInTurnId).toBe('collab-1');
            expect(mockRepository.save).toHaveBeenCalled();
        });
    });

    describe('startMaintenance', () => {
        it('should start maintenance and update status', async () => {
            const maintenance = new MaintenanceRecord({
                id: 'maint-1',
                assetId: 'asset-1',
                type: 'CORRECTIVE',
                status: 'SCHEDULED',
                scheduledDate: new Date(),
                reason: 'Issue',
                startNote: ''
            });

            mockRepository.findById.mockResolvedValue(maintenance);

            const result = await useCases.startMaintenance('maint-1', 'Started checking');

            expect(result.status).toBe('IN_PROGRESS');
            expect(result.startNote).toBe('Started checking');
            expect(mockRepository.save).toHaveBeenCalledWith(maintenance);
        });

        it('should throw if maintenance not found', async () => {
            mockRepository.findById.mockResolvedValue(null);
            await expect(useCases.startMaintenance('maint-1', 'Notes')).rejects.toThrow('Mantenimiento no encontrado');
        });
    });

    describe('completeMaintenance', () => {
        it('should complete maintenance and send email', async () => {
            const maintenance = new MaintenanceRecord({
                id: 'maint-1',
                assetId: 'asset-1',
                type: 'CORRECTIVE',
                status: 'IN_PROGRESS',
                scheduledDate: new Date(),
                reason: 'Issue',
                startNote: 'Started'
            });

            mockRepository.findById.mockResolvedValue(maintenance);

            const result = await useCases.completeMaintenance('maint-1', 'Fixed the issue');

            expect(result.status).toBe('COMPLETED');
            expect(result.notes).toBe('Fixed the issue');
            expect(result.executionDate).toBeDefined();
            expect(mockRepository.save).toHaveBeenCalled();
        });
    });
});
