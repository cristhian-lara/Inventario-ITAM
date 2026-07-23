export interface FieldDefinition {
    name: string;
    type: 'text' | 'number' | 'select' | 'boolean';
    isRequired: boolean;
    options?: string[]; // Para tipos 'select'
    unit?: string; // Unidad de medida, ej. 'GB', 'MHz'
    validationRegex?: string;
    validationMessage?: string;
}

export interface CategoryProps {
    id?: number;
    name: string;
    schemaDefinition: {
        requiresPlacaIkusi?: boolean; // Default should be true if not provided
        /**
         * Prefijo del ID autoincremental para categorías sin Placa Ikusi
         * (ej. 'PER' para Periféricos ⇒ PER001, PER002...). Si no se define,
         * el consecutivo se genera sin prefijo, a 6 dígitos.
         */
        idPrefix?: string;
        fields: FieldDefinition[];
    };
}

export class Category {
    private readonly props: CategoryProps;

    constructor(props: CategoryProps) {
        // Reglas de negocio del dominio
        if (!props.name || props.name.trim() === '') {
            throw new Error('Category name cannot be empty');
        }
        this.props = props;
    }

    get id(): number | undefined { return this.props.id; }
    get name(): string { return this.props.name; }
    get schemaDefinition(): Record<string, any> { return this.props.schemaDefinition; }

    /**
     * Validador de esquemas JSON. 
     * Para el MVP validamos campos requeridos. En prod usaríamos AJV.
     */
    public validateDynamicAttributes(payload: Record<string, any>): string[] {
        const errors: string[] = [];
        const fields = this.props.schemaDefinition.fields || [];

        for (const field of fields) {
            const value = payload[field.name];
            
            if (field.isRequired) {
                if (value === undefined || value === null || value === '') {
                    errors.push(`Falta el atributo requerido: ${field.name}`);
                    continue; // Skip further validation if empty
                }
            }

            if (value !== undefined && value !== null && value !== '') {
                // Validación por Regex
                if (field.validationRegex) {
                    const regex = new RegExp(field.validationRegex);
                    if (!regex.test(value)) {
                        errors.push(field.validationMessage || `El campo ${field.name} tiene un formato inválido.`);
                    }
                }

                // Validación de opciones para tipo 'select'
                if (field.type === 'select' && field.options && Array.isArray(field.options) && field.options.length > 0) {
                    const validOptions = field.unit 
                        ? field.options.map(opt => String(opt).includes(field.unit!) ? String(opt) : `${opt} ${field.unit}`)
                        : field.options.map(opt => String(opt));
                        
                    if (!validOptions.includes(String(value)) && !field.options.map(o => String(o)).includes(String(value))) {
                        errors.push(`El valor '${value}' para ${field.name} no es válido. Opciones permitidas: ${field.options.join(', ')}`);
                    }
                }
            }
        }
        return errors;
    }
}
