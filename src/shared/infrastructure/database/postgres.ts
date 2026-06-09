import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'secret',
    database: process.env.DB_NAME || 'itam_db',
    synchronize: true, // ¡Solo para MVP local! En producción usar migrations.
    logging: false,
    entities: [
        __dirname + '/../../../modules/**/infrastructure/orm/*.entity{.ts,.js}'
    ],
    subscribers: [],
    migrations: [],
});

export const initializeDatabase = async () => {
    try {
        await AppDataSource.initialize();
        console.log('✅ Conexión a PostgreSQL establecida exitosamente.');
    } catch (error) {
        console.error('❌ Error al conectar con PostgreSQL:', error);
        throw error;
    }
};
