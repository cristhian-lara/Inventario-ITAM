import { DataSource } from 'typeorm';

const AppDataSource = new DataSource({
    type: "postgres",
    url: "postgres://postgres:postgres@localhost:5432/inventario_ikusi",
    synchronize: false,
    logging: false,
});

AppDataSource.initialize().then(async () => {
    const assignments = await AppDataSource.query(`SELECT * FROM assignments`);
    console.log(JSON.stringify(assignments, null, 2));
    process.exit(0);
});
