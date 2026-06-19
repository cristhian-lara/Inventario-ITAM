import { CollaboratorUseCases } from '../../src/modules/collaborator/application/CollaboratorUseCases';
import { ICollaboratorRepository } from '../../src/modules/collaborator/domain/ICollaboratorRepository';
import { Collaborator } from '../../src/modules/collaborator/domain/Collaborator';
import { CollaboratorHistory } from '../../src/modules/collaborator/domain/CollaboratorHistory';

jest.mock('uuid', () => ({ v4: () => '12345' }));

describe('CollaboratorUseCases', () => {
    let mockRepository: jest.Mocked<ICollaboratorRepository>;
    let mockDepartmentRepo: any;
    let mockCecosRepo: any;
    let useCases: CollaboratorUseCases;

    beforeEach(() => {
        mockRepository = {
            save: jest.fn(),
            update: jest.fn(),
            findById: jest.fn(),
            findByEmail: jest.fn(),
            findAll: jest.fn(),
            saveHistory: jest.fn(),
            getHistory: jest.fn()
        } as any;

        mockDepartmentRepo = {
            findById: jest.fn()
        };

        mockCecosRepo = {
            findById: jest.fn()
        };

        useCases = new CollaboratorUseCases(mockRepository, mockDepartmentRepo, mockCecosRepo);
    });

    describe('createCollaborator', () => {
        it('should create and save a new collaborator', async () => {
            mockDepartmentRepo.findById.mockResolvedValue({ id: 1, name: 'IT' });
            mockRepository.findByEmail.mockResolvedValue(null);

            const props = {
                id: '123',
                name: 'John Doe',
                email: 'john@ikusi.com',
                department: 1,
                location: 'Bogotá',
                dynamicAttributes: {}
            };

            const result = await useCases.createCollaborator(props);

            expect(result).toBeInstanceOf(Collaborator);
            expect(result.name).toBe('John Doe');
            expect(result.status).toBe('ACTIVE');
            expect(mockRepository.save).toHaveBeenCalled();
        });
    });

    describe('toggleCollaboratorStatus', () => {
        it('should toggle status to INACTIVE', async () => {
            const collab = Collaborator.create('123', 'John', 'j@m.com', 1, 'BOG', new Date(), false, null, {});
            mockRepository.findById.mockResolvedValue(collab);
            
            const result = await useCases.toggleCollaboratorStatus('123');
            expect(result.status).toBe('INACTIVE');
            expect(mockRepository.update).toHaveBeenCalled();
        });
    });

    describe('getCollaboratorHistory', () => {
        it('should return history array', async () => {
            mockRepository.getHistory.mockResolvedValue([]);
            const result = await useCases.getCollaboratorHistory('123');
            expect(Array.isArray(result)).toBe(true);
            expect(mockRepository.getHistory).toHaveBeenCalledWith('123');
        });
    });
});
