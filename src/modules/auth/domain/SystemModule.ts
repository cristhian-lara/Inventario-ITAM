export class SystemModule {
    constructor(
        public readonly id: string,
        public key: string,
        public name: string,
        public displayOrder: number,
        public isActive: boolean
    ) {}
}
