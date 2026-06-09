import { Assignment, AssignmentProps, SignatureMetadata } from '../Assignment';

describe('Assignment Domain Rules', () => {
    const defaultProps: AssignmentProps = {
        id: 'assig-1',
        assetId: 'asset-123',
        collaboratorId: 'collab-456',
        status: 'PENDING_ACCEPTANCE',
        startDate: new Date()
    };

    const mockMetadata: SignatureMetadata = {
        ipAddress: '192.168.1.5',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date()
    };

    it('debería arrojar error si se intenta crear sin assetId o collaboratorId', () => {
        expect(() => new Assignment({ ...defaultProps, assetId: '' })).toThrow('Asset ID y Collaborator ID son obligatorios');
    });

    it('debería generar un token exitosamente en estado PENDING_ACCEPTANCE', () => {
        const assignment = new Assignment({ ...defaultProps });
        const mockGenerator = (id: string) => `JWT-TOKEN-FOR-${id}`;
        
        const token = assignment.generateToken(mockGenerator);
        
        expect(token).toBe('JWT-TOKEN-FOR-assig-1');
        expect(assignment.signatureToken).toBe('JWT-TOKEN-FOR-assig-1');
    });

    it('debería aceptar la asignación con un token válido y guardar metadatos', () => {
        const assignment = new Assignment({ ...defaultProps });
        assignment.generateToken(() => 'VALID_TOKEN');

        assignment.acceptAssignment('VALID_TOKEN', mockMetadata);

        expect(assignment.status).toBe('ACCEPTED');
        expect(assignment.signatureMetadata).toEqual(mockMetadata);
        expect(assignment.signatureToken).toBeUndefined(); // El token se consumió
    });

    it('debería arrojar error al intentar aceptar con un token inválido', () => {
        const assignment = new Assignment({ ...defaultProps });
        assignment.generateToken(() => 'VALID_TOKEN');

        expect(() => assignment.acceptAssignment('WRONG_TOKEN', mockMetadata))
            .toThrow('Token de firma inválido o expirado');
        expect(assignment.status).toBe('PENDING_ACCEPTANCE'); // Estado no cambia
    });

    it('debería permitir iniciar la devolución y cerrarla con confirmación', () => {
        // Configuramos la asignación como ya aceptada
        const assignment = new Assignment({ ...defaultProps, status: 'ACCEPTED' });

        // Paso 1: Iniciar devolución
        assignment.initiateReturn();
        expect(assignment.status).toBe('PENDING_RETURN');

        // Paso 2: Generar token para devolución
        assignment.generateToken(() => 'RETURN_TOKEN');

        // Paso 3: Confirmar la devolución
        const returnMetadata = { ...mockMetadata, ipAddress: '10.0.0.1' };
        assignment.confirmReturn('RETURN_TOKEN', returnMetadata);

        expect(assignment.status).toBe('RETURNED');
        expect(assignment.signatureMetadata).toEqual(returnMetadata);
    });

    it('debería evitar generar token si el estado no es pendiente', () => {
        const assignment = new Assignment({ ...defaultProps, status: 'ACCEPTED' });
        expect(() => assignment.generateToken(() => 'ANY_TOKEN'))
            .toThrow('Solo se puede generar token para actas pendientes de firma');
    });
});
