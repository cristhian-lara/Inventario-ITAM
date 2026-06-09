# Inventario Ikusi

Plataforma integral de gestión de inventarios para la administración de activos, colaboradores y mantenimientos.

## Tecnologías Utilizadas

- **Frontend:** React (con TypeScript), Vite, React Query, React Router DOM, y CSS puro para los estilos de la interfaz de usuario.
- **Backend:** Node.js, Express, TypeScript, TypeORM.
- **Base de Datos:** PostgreSQL.

## Estructura del Proyecto

El proyecto está dividido en dos partes principales:
- `frontend/`: Aplicación cliente en React.
- `src/` (y raíz): Código del servidor Node.js y configuración del backend.

## Requisitos Previos

Antes de ejecutar el proyecto, asegúrate de tener instalado:
- [Node.js](https://nodejs.org/) (Versión 18 o superior recomendada).
- [PostgreSQL](https://www.postgresql.org/) (Corriendo localmente o accesible mediante red).
- Git.

## Descarga e Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd Inventario-Ikusi
   ```

2. **Instalar dependencias del Backend:**
   En la raíz del proyecto, ejecuta:
   ```bash
   npm install
   ```

3. **Instalar dependencias del Frontend:**
   Navega a la carpeta `frontend` y ejecuta:
   ```bash
   cd frontend
   npm install
   ```

## Configuración de Entorno

### Configuración del Backend
En la raíz del proyecto, crea un archivo `.env` tomando como base la configuración que utilices para tu entorno. Debes incluir las variables de entorno para la conexión a la base de datos PostgreSQL y puertos.
Ejemplo de `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=tu_usuario
DB_PASSWORD=tu_contraseña
DB_DATABASE=ikusi_db
PORT=3000
```

*Nota: Es posible que tu aplicación ya maneje valores por defecto en los archivos de configuración, verifica `src/api/server.ts` y las entidades de TypeORM si requieres afinar la conexión.*

### Configuración del Frontend
Si el backend no corre en el puerto `3000`, debes actualizar la URL base de las peticiones en los componentes del frontend (ubicados en `frontend/src/pages/`).

## Ejecución en Local

Para levantar todo el entorno de desarrollo, necesitarás dos terminales:

**Terminal 1: Iniciar el Backend**
Ubicado en la raíz del proyecto (`Inventario-Ikusi/`), ejecuta:
```bash
npm run start
# o alternativamente:
npx ts-node src/api/server.ts
```
El servidor iniciará (típicamente en el puerto 3000) y se conectará a la base de datos PostgreSQL, sincronizando las tablas automáticamente.

**Terminal 2: Iniciar el Frontend**
Navega a la carpeta `frontend/` y ejecuta:
```bash
cd frontend
npm run dev
```
La aplicación web estará disponible en `http://localhost:5173`.

## Funcionalidades Principales

- **Dashboard:** Visión general con tarjetas de estado.
- **Gestión de Activos:** Registro, visualización, modificación, asignación, y devolución de activos tecnológicos (Laptops, Celulares, Pantallas, etc.). Soporta características dinámicas según la categoría del activo.
- **Configuración (Administración):** Permite administrar Categorías de Activos, Departamentos y Centros de Costos (CECOS).
- **Colaboradores:** Administración de personal, asignación de departamentos, CECOS y visualización del perfil y activos asignados al colaborador.
- **Mantenimientos:** Registro, consulta y notas asociadas al mantenimiento de los activos (Preventivo o Correctivo).

## Decisiones de Arquitectura

El proyecto está diseñado siguiendo **Clean Architecture** y principios de **Domain-Driven Design (DDD)** para el backend:
- **Dominio:** Entidades y reglas de negocio puras (`/src/modules/*/domain`).
- **Casos de Uso / Aplicación:** Lógica de orquestación (`/src/modules/*/application`).
- **Infraestructura:** Repositorios, acceso a bases de datos (`/src/modules/*/infrastructure`).
- **API (Presentación):** Rutas y controladores (`/src/api`).

Esto garantiza alta mantenibilidad, bajo acoplamiento y facilidad para escalar el sistema a microservicios si se requiere en el futuro.
