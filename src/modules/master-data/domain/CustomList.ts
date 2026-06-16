export class CustomListItem {
    constructor(
        public id: string,
        public listId: string,
        public value: string,
        public description: string | null = null,
        public orderIndex: number = 0,
        public isActive: boolean = true
    ) {}
}

export class CustomList {
    constructor(
        public id: string,
        public name: string,
        public description: string | null = null,
        public code: string,
        public isSystem: boolean = false,
        public items: CustomListItem[] = [],
        public targetEntity: 'Collaborator' | 'Asset' | 'None' = 'None'
    ) {}
}
