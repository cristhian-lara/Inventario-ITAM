-- Elimina TODOS los activos y sus dependientes directos (asignaciones y
-- upgrades de hardware). Transaccional: todo o nada.
--
-- PRESERVA: colaboradores, cecos, categorias, usuarios, departamentos,
--           historial de colaboradores y mantenimientos.
--   (Los mantenimientos referencian el activo por Placa, sin FK; si recargas
--    los activos con las mismas Placas, se vuelven a vincular. Si tambien
--    quieres borrarlos, descomenta la linea DELETE FROM maintenances.)
--
-- Aplicar en produccion (Docker):
--   docker exec -i itam-db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < clean-assets-prod.sql

BEGIN;

DELETE FROM hardware_upgrades;
DELETE FROM assignments;
-- DELETE FROM maintenances;   -- descomenta si tambien quieres borrar los mantenimientos
DELETE FROM assets;

COMMIT;
