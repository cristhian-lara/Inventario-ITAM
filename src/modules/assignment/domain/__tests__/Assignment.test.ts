import { Assignment, SignatureMetadata } from '../Assignment';

describe('Assignment Domain Entity', () => {
    const mockMetadata: SignatureMetadata = {
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date()
    };

    it('debe crear una asignación con estado PENDING_ACCEPTANCE', () => {
        const assignment = new Assignment({
            id: 'assig-1',
            assetId: 'asset-1',
            collaboratorId: 'collab-1',
            status: 'PENDING_ACCEPTANCE',
            startDate: new Date()
        });

        expect(assignment.id).toBe('assig-1');
        expect(assignment.status).toBe('PENDING_ACCEPTANCE');
    });

    it('debe arrojar error si se intenta crear sin assetId', () => {
        expect(() => {
            new Assignment({
                id: 'assig-1',
                assetId: '',
                collaboratorId: 'collab-1',
                status: 'PENDING_ACCEPTANCE',
                startDate: new Date()
            });
        }).toThrow('Asset ID y Collaborator ID son obligatorios');
    });

    it('debe generar un token exitosamente si el estado es PENDING_ACCEPTANCE', () => {
        const assignment = new Assignment({
            id: 'assig-1',
            assetId: 'asset-1',
            collaboratorId: 'collab-1',
            status: 'PENDING_ACCEPTANCE',
            startDate: new Date()
        });

        const token = assignment.generateToken((id) => `token-${id}`);
        expect(token).toBe('token-assig-1');
        expect(assignment.signatureToken).toBe('token-assig-1');
    });

    it('debe arrojar error al generar token si el estado es ACCEPTED', () => {
        const assignment = new Assignment({
            id: 'assig-1',
            assetId: 'asset-1',
            collaboratorId: 'collab-1',
            status: 'ACCEPTED',
            startDate: new Date()
        });

        expect(() => {
            assignment.generateToken((id) => `token-${id}`);
        }).toThrow('Solo se puede generar token para actas pendientes de firma');
    });

    it('debe aceptar asignación con token válido', () => {
        const assignment = new Assignment({
            id: 'assig-1',
            assetId: 'asset-1',
            collaboratorId: 'collab-1',
            status: 'PENDING_ACCEPTANCE',
            startDate: new Date()
        });

        assignment.generateToken((id) => `token-${id}`);
        assignment.acceptAssignment('token-assig-1', mockMetadata);

        expect(assignment.status).toBe('ACCEPTED');
        expect(assignment.signatureToken).toBeUndefined();
        expect(assignment.signatureMetadata).toEqual(mockMetadata);
    });

    it('debe arrojar error al aceptar con token inválido', () => {
        const assignment = new Assignment({
            id: 'assig-1',
            assetId: 'asset-1',
            collaboratorId: 'collab-1',
            status: 'PENDING_ACCEPTANCE',
            startDate: new Date()
        });

        assignment.generateToken((id) => `token-${id}`);
        
        expect(() => {
            assignment.acceptAssignment('invalid-token', mockMetadata);
        }).toThrow('Token de firma inválido o expirado');
    });

    it('debe iniciar devolución si el estado es ACCEPTED', () => {
        const assignment = new Assignment({
            id: 'assig-1',
            assetId: 'asset-1',
            collaboratorId: 'collab-1',
            status: 'ACCEPTED',
            startDate: new Date()
        });

        assignment.initiateReturn();
        expect(assignment.status).toBe('PENDING_RETURN');
    });

    it('debe arrojar error al iniciar devolución si no está ACCEPTED', () => {
        const assignment = new Assignment({
            id: 'assig-1',
            assetId: 'asset-1',
            collaboratorId: 'collab-1',
            status: 'PENDING_ACCEPTANCE',
            startDate: new Date()
        });

        expect(() => {
            assignment.initiateReturn();
        }).toThrow('Solo se puede devolver un activo que fue previamente aceptado');
    });

    it('debe confirmar devolución con token válido', () => {
        const assignment = new Assignment({
            id: 'assig-1',
            assetId: 'asset-1',
            collaboratorId: 'collab-1',
            status: 'PENDING_RETURN',
            startDate: new Date()
        });

        assignment.generateToken((id) => `token-${id}`);
        assignment.confirmReturn('token-assig-1', mockMetadata);

        expect(assignment.status).toBe('RETURNED');
        expect(assignment.endDate).toEqual(mockMetadata.timestamp);
        expect(assignment.signatureToken).toBeUndefined();
    });

    it('debe procesar devolución forzada correctamente', () => {
        const assignment = new Assignment({
            id: 'assig-1',
            assetId: 'asset-1',
            collaboratorId: 'collab-1',
            status: 'ACCEPTED',
            startDate: new Date()
        });

        assignment.forceReturn(mockMetadata);

        expect(assignment.status).toBe('RETURNED');
        expect(assignment.endDate).toEqual(mockMetadata.timestamp);
        expect(assignment.signatureMetadata).toEqual(mockMetadata);
    });
});
