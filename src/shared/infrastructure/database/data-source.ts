import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

// DataSource usado por la CLI de TypeORM (migration:generate, migration:run, etc.)
// Separado del AppDataSource que consume el servidor para poder apuntarlo a una
// base de datos distinta (ej. la temporal usada para generar la migración base).
export const CliDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'secret',
    database: process.env.DB_MIGRATION_DATABASE || process.env.DB_DATABASE || process.env.DB_NAME || 'itam_db',
    synchronize: false,
    logging: false,
    entities: [
        __dirname + '/../../../modules/**/infrastructure/orm/*.entity{.ts,.js}'
    ],
    subscribers: [],
    migrations: [
        __dirname + '/migrations/*{.ts,.js}'
    ],
});
