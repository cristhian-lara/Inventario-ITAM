import { CollaboratorUseCases } from '../../src/modules/collaborator/application/CollaboratorUseCases';
import { ICollaboratorRepository } from '../../src/modules/collaborator/domain/ICollaboratorRepository';
import { IDepartmentRepository } from '../../src/modules/collaborator/domain/IDepartmentRepository';
import { ICecosRepository } from '../../src/modules/collaborator/domain/ICecosRepository';
import { Department } from '../../src/modules/collaborator/domain/Department';
import { Collaborator } from '../../src/modules/collaborator/domain/Collaborator';

jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

describe('CollaboratorUseCases', () => {
    let useCases: CollaboratorUseCases;
    let mockCollabRepo: jest.Mocked<ICollaboratorRepository>;
    let mockDeptRepo: jest.Mocked<IDepartmentRepository>;
    let mockCecosRepo: jest.Mocked<ICecosRepository>;

    beforeEach(() => {
        mockCollabRepo = {
            save: jest.fn(),
            findById: jest.fn(),
            findByEmail: jest.fn(),
            findAll: jest.fn(),
            findAllPaginated: jest.fn(),
            findActiveLeaderInDepartment: jest.fn(),
            update: jest.fn(),
            saveHistory: jest.fn(),
            getHistory: jest.fn(),
        };

        mockDeptRepo = {
            save: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
        };

        mockCecosRepo = {
            save: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
            delete: jest.fn(),
        };

        useCases = new CollaboratorUseCases(mockCollabRepo, mockDeptRepo, mockCecosRepo);
    });

    describe('createCollaborator', () => {
        it('should throw an error if email already exists', async () => {
            const existingCollab = Collaborator.create('1', 'Test', 'test@ikusi.com', 1, 'Loc');
            mockCollabRepo.findByEmail.mockResolvedValue(existingCollab);

            await expect(useCases.createCollaborator({ name: 'Test2', email: 'test@ikusi.com', department: 1, location: 'Loc' }))
                .rejects.toThrow('A collaborator with this email already exists');
        });

        it('should throw an error if department does not exist', async () => {
            mockCollabRepo.findByEmail.mockResolvedValue(null);
            mockDeptRepo.findById.mockResolvedValue(null);

            await expect(useCases.createCollaborator({ name: 'Test', email: 'test@ikusi.com', department: 99, location: 'Loc' }))
                .rejects.toThrow('Department not found');
        });

        it('should throw an error if assigning a new leader to a department that already has one', async () => {
            mockCollabRepo.findByEmail.mockResolvedValue(null);
            const dept = Department.create('IT');
            Object.defineProperty(dept, 'id', { value: 1, writable: true });
            mockDeptRepo.findById.mockResolvedValue(dept);
            
            const existingLeader = Collaborator.create('1', 'Leader1', 'l1@ikusi.com', 1, 'Loc');
            Object.defineProperty(existingLeader, 'isLeader', { value: true, writable: true });
            mockCollabRepo.findActiveLeaderInDepartment.mockResolvedValue(existingLeader);

            await expect(useCases.createCollaborator({ name: 'Leader2', email: 'l2@ikusi.com', department: 1, location: 'Loc', isLeader: true }))
                .rejects.toThrow();
        });

        it('should create and save a new collaborator successfully', async () => {
            mockCollabRepo.findByEmail.mockResolvedValue(null);
            mockDeptRepo.findById.mockResolvedValue(Department.create('IT'));
            mockCollabRepo.findAll.mockResolvedValue([]);

            const newCollab = await useCases.createCollaborator({ name: 'Test', email: 'test@ikusi.com', department: 1, location: 'Loc' });

            expect(newCollab.name).toBe('Test');
            expect(mockCollabRepo.save).toHaveBeenCalledTimes(1);
            expect(mockCollabRepo.saveHistory).toHaveBeenCalledTimes(1);
        });
    });

    describe('toggleCollaboratorStatus', () => {
        it('should toggle status from ACTIVE to INACTIVE', async () => {
            const collab = Collaborator.create('1', 'Test', 'test@ikusi.com', 1, 'Loc');
            mockCollabRepo.findById.mockResolvedValue(collab);

            const updated = await useCases.toggleCollaboratorStatus('1');

            expect(updated.status).toBe('INACTIVE');
            expect(mockCollabRepo.update).toHaveBeenCalledTimes(1);
            expect(mockCollabRepo.saveHistory).toHaveBeenCalledTimes(1);
        });
    });
});
