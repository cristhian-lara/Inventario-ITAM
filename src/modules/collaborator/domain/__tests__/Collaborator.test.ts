import { Collaborator } from '../Collaborator';

describe('Collaborator Domain Entity', () => {
    it('debe crear un colaborador correctamente usando el constructor', () => {
        const date = new Date();
        const collaborator = new Collaborator(
            'collab-1',
            'Juan Perez',
            'juan@ikusi.com',
            'IT',
            'HQ',
            'ACTIVE',
            date,
            null,
            date
        );

        expect(collaborator.id).toBe('collab-1');
        expect(collaborator.name).toBe('Juan Perez');
        expect(collaborator.email).toBe('juan@ikusi.com');
        expect(collaborator.status).toBe('ACTIVE');
    });

    it('debe crear un colaborador usando el factory method', () => {
        const collaborator = Collaborator.create(
            'collab-2',
            'Maria Gomez',
            'maria@ikusi.com',
            'RH',
            'HQ'
        );

        expect(collaborator.id).toBe('collab-2');
        expect(collaborator.name).toBe('Maria Gomez');
        expect(collaborator.status).toBe('ACTIVE');
        expect(collaborator.deactivationDate).toBeNull();
    });
});
