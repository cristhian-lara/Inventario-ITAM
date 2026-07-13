import { MaintenanceUseCases, IAssetAssignmentService } from '../../src/modules/maintenance/application/MaintenanceUseCases';
import { IMaintenanceRepository } from '../../src/modules/maintenance/domain/IMaintenanceRepository';
import { MaintenanceRecord } from '../../src/modules/maintenance/domain/MaintenanceRecord';

describe('MaintenanceUseCases', () => {
    let useCases: MaintenanceUseCases;
    let mockRepo: jest.Mocked<IMaintenanceRepository>;
    let mockAssignmentService: jest.Mocked<IAssetAssignmentService>;
    let mockMailerService: any;

    beforeEach(() => {
        mockRepo = {
            save: jest.fn(),
            findById: jest.fn(),
            findByAssetId: jest.fn(),
            findAll: jest.fn(),
        };

        mockAssignmentService = {
            getActiveAssignmentForAsset: jest.fn(),
        };

        mockMailerService = {
            sendMaintenanceSignatureEmail: jest.fn(),
        };

        useCases = new MaintenanceUseCases(mockRepo, mockAssignmentService, mockMailerService);
    });

    describe('createManualMaintenance', () => {
        it('should throw an error if a maintenance of the same type is already scheduled', async () => {
            const existingRecord = new MaintenanceRecord({
                id: 'm1',
                assetId: 'asset1',
                type: 'PREVENTIVE',
                status: 'SCHEDULED',
                scheduledDate: new Date(),
            });

            mockRepo.findByAssetId.mockResolvedValue([existingRecord]);

            await expect(useCases.createManualMaintenance({
                assetId: 'asset1',
                type: 'PREVENTIVE',
                scheduledDate: new Date()
            })).rejects.toThrow(/El equipo ya cuenta con un mantenimiento programado/);
        });

        it('should create and save a new scheduled maintenance successfully', async () => {
            mockRepo.findByAssetId.mockResolvedValue([]);
            mockAssignmentService.getActiveAssignmentForAsset.mockResolvedValue({
                collaboratorId: 'collab1',
                collaboratorName: 'Juan',
                collaboratorEmail: 'juan@ikusi.com'
            });

            const record = await useCases.createManualMaintenance({
                assetId: 'asset1',
                type: 'CORRECTIVE',
                scheduledDate: new Date(),
                reason: 'Screen broken'
            });

            expect(record.assetId).toBe('asset1');
            expect(record.type).toBe('CORRECTIVE');
            expect(record.status).toBe('SCHEDULED');
            expect(record.collaboratorInTurnId).toBe('collab1');
            expect(mockRepo.save).toHaveBeenCalledTimes(1);
        });
    });

    describe('completeMaintenance', () => {
        it('should throw an error if maintenance is not found', async () => {
            mockRepo.findById.mockResolvedValue(null);
            await expect(useCases.completeMaintenance('m1')).rejects.toThrow('Mantenimiento no encontrado');
        });

        it('should complete maintenance and send email if assigned', async () => {
            const maint = new MaintenanceRecord({
                id: 'm1',
                assetId: 'asset1',
                type: 'PREVENTIVE',
                status: 'IN_PROGRESS',
                scheduledDate: new Date(),
                collaboratorInTurnId: 'collab1'
            });
            maint.completeMaintenance = jest.fn().mockReturnValue(new MaintenanceRecord({
                id: 'm2', assetId: 'asset1', type: 'PREVENTIVE', status: 'SCHEDULED', scheduledDate: new Date()
            }));
            maint.generateSignatureToken = jest.fn().mockReturnValue('mock-token');

            mockRepo.findById.mockResolvedValue(maint);
            mockAssignmentService.getActiveAssignmentForAsset.mockResolvedValue({
                collaboratorId: 'collab1',
                collaboratorName: 'Juan',
                collaboratorEmail: 'juan@ikusi.com'
            });

            await useCases.completeMaintenance('m1', 'All good');

            expect(maint.completeMaintenance).toHaveBeenCalled();
            expect(mockRepo.save).toHaveBeenCalledTimes(2); // saves current and next scheduled
            expect(mockMailerService.sendMaintenanceSignatureEmail).toHaveBeenCalledWith('juan@ikusi.com', 'm1', 'mock-token', undefined);
        });
    });

    describe('signMaintenanceAct', () => {
        it('should sign the maintenance successfully', async () => {
            const maint = new MaintenanceRecord({
                id: 'm1',
                assetId: 'asset1',
                type: 'PREVENTIVE',
                status: 'COMPLETED',
                scheduledDate: new Date(),
            });
            maint.signMaintenance = jest.fn();

            mockRepo.findById.mockResolvedValue(maint);

            await useCases.signMaintenanceAct('m1', 'token123', '127.0.0.1', 'Mozilla/5.0');

            expect(maint.signMaintenance).toHaveBeenCalledWith('token123', expect.any(Object));
            expect(mockRepo.save).toHaveBeenCalledWith(maint);
        });
    });
});
