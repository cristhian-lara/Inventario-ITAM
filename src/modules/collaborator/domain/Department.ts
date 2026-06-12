export class Department {
    constructor(
        public readonly id: number | undefined,
        public readonly name: string,
        public readonly description: string | null,
        public readonly createdAt: Date
    ) {
        if (!name || name.trim() === '') {
            throw new Error('Department name cannot be empty');
        }
    }

    static create(name: string, description: string | null = null, id?: number): Department {
        return new Department(id, name, description, new Date());
    }
}
