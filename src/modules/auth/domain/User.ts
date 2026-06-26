import { Role } from './Role';

export class User {
    constructor(
        public readonly id: string,
        public username: string,
        public passwordHash: string,
        public role: Role,
        public readonly createdAt: Date,
        public updatedAt: Date
    ) {}
}
