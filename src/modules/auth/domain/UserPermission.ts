export type PermissionAction = 'read' | 'create' | 'edit' | 'delete';

export class UserPermission {
    constructor(
        public readonly userId: string,
        public readonly moduleKey: string,
        public canRead: boolean,
        public canCreate: boolean,
        public canEdit: boolean,
        public canDelete: boolean
    ) {}

    /** Regla acumulativa: cualquier permiso de escritura implica lectura. */
    normalize(): void {
        if (this.canCreate || this.canEdit || this.canDelete) {
            this.canRead = true;
        }
    }

    allows(action: PermissionAction): boolean {
        switch (action) {
            case 'read': return this.canRead;
            case 'create': return this.canCreate;
            case 'edit': return this.canEdit;
            case 'delete': return this.canDelete;
        }
    }

    hasAnyAccess(): boolean {
        return this.canRead || this.canCreate || this.canEdit || this.canDelete;
    }
}
