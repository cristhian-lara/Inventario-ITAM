/**
 * Migración de préstamos de equipos (idempotente). Ejecutar con el backend DETENIDO:
 *   npx ts-node src/modules/assignment/infrastructure/migrate-loans.ts
 *
 * Agrega a `assignments` las columnas necesarias para diferenciar asignaciones
 * PERMANENTES de PRÉSTAMOS. Todas las filas existentes quedan como PERMANENT
 * (comportamiento actual sin cambios) y sin alerta de vencimiento activa.
 */
import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const migrate = async () => {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'secret',
        database: process.env.DB_DATABASE || process.env.DB_NAME || 'itam_db',
    });
    await client.connect();
    try {
        await client.query('BEGIN');

        console.log('→ Agregando columna assignment_type...');
        await client.query("ALTER TABLE assignments ADD COLUMN IF NOT EXISTS assignment_type varchar DEFAULT 'PERMANENT'");
        await client.query("UPDATE assignments SET assignment_type = 'PERMANENT' WHERE assignment_type IS NULL");
        await client.query('ALTER TABLE assignments ALTER COLUMN assignment_type SET NOT NULL');

        console.log('→ Agregando columna expected_return_date...');
        await client.query('ALTER TABLE assignments ADD COLUMN IF NOT EXISTS expected_return_date timestamp');

        console.log('→ Agregando columna last_alert_sent_at...');
        await client.query('ALTER TABLE assignments ADD COLUMN IF NOT EXISTS last_alert_sent_at timestamp');
        // Limpieza: la columna booleana de una iteración anterior de esta migración ya no se usa.
        await client.query('ALTER TABLE assignments DROP COLUMN IF EXISTS overdue_alert_sent');

        await client.query('COMMIT');
        console.log('✅ Migración de préstamos completada. Las asignaciones existentes quedaron como PERMANENT.');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        await client.end();
    }
};

(async () => {
    try {
        await migrate();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error en la migración de préstamos:', error);
        process.exit(1);
    }
})();
