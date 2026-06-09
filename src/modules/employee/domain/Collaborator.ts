export interface CollaboratorProps {
    id: string;
    name: string;
    email: string;
    carePoints: number; // Sistema de Gamificación
    annotations: string[];
}

export class Collaborator {
    private props: CollaboratorProps;

    constructor(props: CollaboratorProps) {
        if (!props.email.includes('@')) {
            throw new Error('El correo del colaborador es obligatorio e inválido');
        }
        this.props = {
            ...props,
            carePoints: props.carePoints ?? 0,
            annotations: props.annotations ?? []
        };
    }

    get id(): string { return this.props.id; }
    get name(): string { return this.props.name; }
    get email(): string { return this.props.email; }
    get carePoints(): number { return this.props.carePoints; }
    get annotations(): string[] { return [...this.props.annotations]; }

    public addAnnotation(note: string, pointImpact: number): void {
        this.props.annotations.push(note);
        this.props.carePoints += pointImpact;
    }
}
