export class Cecos {
    constructor(
        public readonly id: string,
        public name: string,
        public description: string
    ) {}

    update(name: string, description: string) {
        this.name = name;
        this.description = description;
    }
}
