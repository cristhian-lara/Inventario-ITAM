export class Collaborator {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly email: string,
        public readonly department: string,
        public readonly location: string,
        public readonly status: 'ACTIVE' | 'INACTIVE',
        public readonly activationDate: Date,
        public readonly deactivationDate: Date | null,
        public readonly createdAt: Date,
        public readonly isLeader: boolean = false,
        public readonly leaderId: string | null = null,
        public readonly dynamicAttributes: Record<string, any> = {}
    ) {}

    static create(
        id: string,
        name: string,
        email: string,
        department: string,
        location: string,
        activationDate: Date = new Date(),
        isLeader: boolean = false,
        leaderId: string | null = null,
        dynamicAttributes: Record<string, any> = {}
    ): Collaborator {
        return new Collaborator(
            id,
            name,
            email,
            department,
            location,
            'ACTIVE',
            activationDate,
            null,
            new Date(),
            isLeader,
            leaderId,
            dynamicAttributes
        );
    }
}
