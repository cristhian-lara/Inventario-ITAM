import { AppDataSource } from './src/shared/infrastructure/database/postgres';

AppDataSource.initialize().then(async () => {
    const schema = {
        fields: [
            { name: 'hostname', isRequired: true, type: 'text', validationRegex: '^NBCO[0-9]{4}$', validationMessage: 'Debe tener formato NBCO0001' },
            { name: 'placa_ikusi', isRequired: true, type: 'text', validationRegex: '^IT-[0-9]{4}$', validationMessage: 'Debe tener formato IT-0001' },
            { name: 'procesador', isRequired: true, type: 'select', options: ['Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'AMD Ryzen 5', 'AMD Ryzen 7', 'Apple M1', 'Apple M2'] },
            { name: 'ram', isRequired: true, type: 'select', options: ['8GB', '16GB', '32GB', '64GB'] },
            { name: 'disco_duro', isRequired: true, type: 'select', options: ['256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD'] }
        ]
    };

    await AppDataSource.query(`
        INSERT INTO categories (id, name, attributes_schema) 
        VALUES ('computadores', 'Computadores', $1) 
        ON CONFLICT (id) DO UPDATE SET attributes_schema = $1, name = 'Computadores'
    `, [JSON.stringify(schema)]);

    console.log('Categoria Computadores actualizada correctamente');
    process.exit(0);
}).catch(console.error);
