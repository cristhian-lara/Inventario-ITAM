-- Elimina TODOS los mantenimientos (programados, en progreso, completados,
-- cancelados). Transaccional: todo o nada.
--
-- PRESERVA: activos, colaboradores, asignaciones, cecos, categorias, usuarios.
--   Ninguna otra tabla referencia a maintenances, por lo que no hay dependientes
--   que borrar.
--
-- Aplicar en produccion (Docker):
--   docker exec -i itam-db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < clean-maintenances-prod.sql

BEGIN;

DELETE FROM maintenances;

COMMIT;
