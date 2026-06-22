# Inventario Ikusi - ITAM (IT Asset Management)

Plataforma integral de gestión de inventarios para la administración eficiente de activos tecnológicos, colaboradores, asignaciones y mantenimientos. Diseñada bajo principios de Clean Architecture y Domain-Driven Design (DDD).

## 🚀 Descripción General

Inventario Ikusi es una solución full-stack que digitaliza y centraliza el control de los recursos de TI. Permite hacer un seguimiento del ciclo de vida completo de cada dispositivo (laptops, celulares, periféricos), desde su alta en el sistema hasta su asignación, mantenimiento y eventual retiro. Adicionalmente, incluye flujos automatizados para la generación y firma digital de actas (Asignación y Paz y Salvo).

---

## ✨ Funcionalidades Principales

1. **Dashboard Intuitivo:** Vista general rápida con métricas del estado del inventario y gráficas de disponibilidad.
2. **Catálogo Flexible de Activos:**
   - Creación de categorías con campos personalizados (esquemas dinámicos).
   - Control de estados: *Disponible, En Uso, En Mantenimiento, Pendiente de Revisión, Retirado*.
3. **Gestión de Colaboradores:**
   - Directorio de empleados.
   - Vinculación a Departamentos y Centros de Costos (CECOS).
4. **Asignación y Devolución (Actas y Firmas):**
   - Proceso formal de entrega con generación de PDF automático.
   - Envío de correos para recolección de firmas digitales.
   - Posibilidad de firma forzada (Administrativa) con registro de IP y motivo.
5. **Mantenimientos:**
   - Programación de tareas preventivas y correctivas.
   - Registro de diagnóstico, avance y bitácora.
   - Firma de conformidad al finalizar la intervención.
6. **Configuración Global:** Personalización de textos legales y parámetros del sistema en un solo lugar.

---

## 🛠️ Requisitos Técnicos

- **Node.js**: v18 o superior.
- **Base de Datos**: PostgreSQL (versión 13+ recomendada).
- **Gestor de paquetes**: npm o yarn.
- **Git** para control de versiones.

### Tecnologías Clave
- **Frontend**: React 19, Vite, React Router DOM, React Query, Recharts, Lucide-React, CSS Puro (Dark Theme).
- **Backend**: Node.js, Express, TypeScript, TypeORM, Jest (Testing), PDFKit (Generación de PDF), Nodemailer.

---

## 💻 Instalación y Ejecución Local

1. **Clonar el repositorio:**
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd Inventario-ITAM
   ```

2. **Instalar dependencias del Backend:**
   En la raíz del proyecto, instala los paquetes de Node.
   ```bash
   npm install
   ```

3. **Instalar dependencias del Frontend:**
   ```bash
   cd frontend
   npm install
   ```

4. **Configuración de Variables de Entorno (.env):**
   Crea un archivo `.env` en la raíz del proyecto basándote en la configuración de tu entorno:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=tu_password
   DB_DATABASE=ikusi_db
   PORT=3000

   # Correos Electrónicos
   SMTP_HOST=smtp.office365.com
   SMTP_PORT=587
   SMTP_USER=no-reply@tuempresa.com
   SMTP_PASS=tu_contraseña

   # Azure AD / SharePoint (Subida de Actas a la Nube)
   AZURE_TENANT_ID=tu_tenant_id
   AZURE_CLIENT_ID=tu_client_id
   AZURE_CLIENT_SECRET=tu_client_secret
   SHAREPOINT_DRIVE_ID=tu_drive_id
   ```

5. **Iniciar la aplicación (Modo Desarrollo):**

   Necesitarás dos instancias de tu terminal.

   *Terminal 1 (Backend):*
   ```bash
   # En la raíz del proyecto
   npm run dev
   # o
   npm run start
   ```
   *Nota: TypeORM creará/sincronizará automáticamente las tablas en PostgreSQL al conectarse.*

   *Terminal 2 (Frontend):*
   ```bash
   # Dentro de la carpeta frontend/
   npm run dev
   ```

La plataforma estará disponible en `http://localhost:5173`.

---

## 📂 Estructura del Proyecto

El código está organizado separando claramente las responsabilidades entre frontend y backend:

```text
📦 Inventario-ITAM
├── 📂 frontend/               # Aplicación cliente (React + Vite)
│   ├── 📂 src/
│   │   ├── 📂 components/     # Componentes UI reutilizables
│   │   ├── 📂 context/        # Proveedores de estado global (ej. ConfirmContext)
│   │   ├── 📂 pages/          # Vistas principales de la app (Dashboard, Catalog, etc.)
│   │   └── App.tsx / main.tsx # Entrada de la app frontend
│   └── package.json
│
├── 📂 src/                    # Código fuente del Backend (Node.js + TS)
│   ├── 📂 api/                # Controladores (Rutas Express) y config de servidor
│   ├── 📂 modules/            # Módulos del negocio (Arquitectura Limpia)
│   │   ├── 📂 assignment/     # Lógica de asignaciones y devoluciones
│   │   ├── 📂 catalog/        # Gestión de activos y categorías
│   │   ├── 📂 collaborator/   # Gestión de empleados, departamentos y CECOS
│   │   └── 📂 maintenance/    # Flujos de mantenimiento de activos
│   │       ├── 📂 domain/         # Entidades puras y contratos (interfaces)
│   │       ├── 📂 application/    # Casos de uso
│   │       └── 📂 infrastructure/ # Implementaciones de repositorios y BD
│   └── 📂 shared/             # Servicios transversales (Email, Generación PDF)
│
├── 📂 __tests__/              # Pruebas unitarias en Jest (Use Cases)
├── .env                       # Variables de configuración
└── package.json               # Dependencias del backend y scripts globales
```

### Propósito de archivos clave:
- `src/api/server.ts`: Inicializa Express, middlewares (CORS, JSON), y conecta con TypeORM. Aquí se montan las rutas de los módulos.
- `src/shared/infrastructure/services/PdfKitService.ts`: Lógica avanzada de dibujo y maquetación de actas PDF (Asignación, Mantenimiento, Devolución).
- `frontend/src/index.css`: Sistema de diseño global (variables CSS) responsable de la estética moderna, modo oscuro y temas tipo "glassmorphism".

---

## 📘 Ejemplos Básicos de Uso

1. **Configurar una nueva Categoría:**
   - Ve a **Configuración -> Categorías** y haz clic en *Nueva Categoría*.
   - Añade el nombre (ej. "Laptop") y define atributos obligatorios (ej. "macAddress", "Memoria RAM").
2. **Dar de alta un Activo:**
   - Entra a **Catálogo de Activos** -> *Nuevo Activo*.
   - Elige la categoría "Laptop". Se desplegarán los atributos configurados en el paso 1. Registra el Serial y sus especificaciones.
3. **Asignar el Activo a un Empleado:**
   - En el catálogo, busca el activo (estado *Disponible*).
   - Presiona el botón de **Asignar**, selecciona a un colaborador de la lista.
   - El sistema cambiará el estado a *Pendiente de Firma* y enviará un correo electrónico al colaborador con un link único para realizar su trazo de firma digital en el acta.
4. **Firma Administrativa (Forzada):**
   - Si el usuario no puede firmar, el administrador puede ir al activo en *Pendiente de Firma* y elegir **Firma Forzada (TI)**.
   - Se pedirá un motivo justificante, el cual se registrará directamente dentro del documento PDF por auditoría.

---

## ✅ Pruebas Unitarias

El proyecto cuenta con un entorno de testing basado en **Jest**. Las pruebas cubren la lógica core de los casos de uso (Application Layer) y de las entidades (Domain Layer).

Para ejecutar la suite de pruebas:
```bash
npm test
```
