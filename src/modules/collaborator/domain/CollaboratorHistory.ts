export class CollaboratorHistory {
    constructor(
        public readonly id: string,
        public readonly collaboratorId: string,
        public readonly action: 'CREATED' | 'ACTIVATED' | 'DEACTIVATED' | 'ASSET_ASSIGNED' | 'ASSET_RETURNED' | 'DEPARTMENT_CHANGED',
        public readonly timestamp: Date,
        public readonly reason?: string
    ) {}
}
