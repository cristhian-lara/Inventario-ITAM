export class SystemModule {
    constructor(
        public readonly id: string,
        public key: string,
        public name: string,
        public displayOrder: number,
        public isActive: boolean,
        // Acciones que el módulo realmente ofrece (Dashboard y Actas son solo consulta):
        // la matriz de permisos solo habilita las casillas soportadas.
        public supportsCreate: boolean = true,
        public supportsEdit: boolean = true,
        public supportsDelete: boolean = true
    ) {}
}
