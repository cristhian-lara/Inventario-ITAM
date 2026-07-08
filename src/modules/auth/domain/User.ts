import { Role } from './Role';

export class User {
    constructor(
        public readonly id: string,
        public username: string,
        public passwordHash: string,
        public role: Role,
        public fullName: string,
        public email: string,
        public isActive: boolean,
        public readonly createdAt: Date,
        public updatedAt: Date
    ) {}
}
