export type UserRole = 'ADMIN' | 'VIEWER';

export interface SystemUserProps {
    id: string;
    email: string;
    passwordHash: string;
    role: UserRole;
}

export class SystemUser {
    private props: SystemUserProps;

    constructor(props: SystemUserProps) {
        if (!props.email.includes('@')) {
            throw new Error('Email inválido para el usuario del sistema');
        }
        this.props = props;
    }

    get id(): string { return this.props.id; }
    get email(): string { return this.props.email; }
    get role(): UserRole { return this.props.role; }
    get passwordHash(): string { return this.props.passwordHash; }

    public changeRole(newRole: UserRole): void {
        this.props.role = newRole;
    }
}
