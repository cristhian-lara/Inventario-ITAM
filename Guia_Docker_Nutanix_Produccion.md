# Guía para Dummies: Desplegar Docker en Nutanix (Producción)

¡Hola de nuevo! Si estás leyendo esto es porque ya hiciste las pruebas en tu VMware (rama `dev`), validaste que todo funciona correctamente y estás lista para subir esto a tu entorno de Producción en Nutanix.

El proceso es casi exactamente el mismo que hiciste en local, la diferencia es la configuración de la IP y que ahora descargarás la rama principal (`main` o la que uses para producción) del código.

Aquí tienes el paso a paso:

---

## 1. Preparar la Máquina Virtual en Nutanix

Como tu servidor en Nutanix es Ubuntu Server, el proceso de instalación es muy sencillo. Conéctate a tu máquina en Nutanix (mediante SSH o la consola de Nutanix).

Una vez dentro, instala Docker ejecutando estos comandos uno por uno (si no lo tienes instalado aún):
```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```
*(Reinicia la máquina o cierra sesión y vuelve a entrar para que apliquen los permisos sin sudo).*

---

## 2. Clonar el Proyecto en Nutanix

Necesitas descargar el código de tu proyecto a esta máquina.
En la terminal del servidor Nutanix, ubícate en la carpeta donde quieres guardar el proyecto (ejemplo: `/home/usuario/` o `/opt/`):

```bash
# El parámetro "-b main" le dice a git que descargue específicamente la rama main
git clone -b main https://github.com/cristhian-lara/Inventario-ITAM.git inventario-itam
cd inventario-itam
```

> [!IMPORTANT]
> Esto descargará la versión lista para Producción (rama `main`). Asegúrate antes de que tus cambios hayan sido fusionados (merged) desde `dev` a `main` en Github.

---

## 3. Configurar el Entorno (Archivos .env)

Este es el paso más crítico para producción. Necesitamos configurar la IP definitiva de este servidor para que la app sepa comunicarse.

Averigua la IP asignada a tu servidor de Nutanix (ejecuta `ip a`). Digamos que la IP es `10.50.20.100`.

Crea o edita el archivo `.env` en la raíz de tu proyecto:
```bash
nano .env
```

Y asegúrate de colocar las siguientes variables con la **IP del servidor Nutanix** (o un dominio, si tienen uno, ej: `http://inventario.miempresa.com`):

```env
# Configuración Base de Datos (Estas credenciales DEBEN ser fuertes en Producción)
DB_HOST=db
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=una_contraseña_muy_segura_aqui
DB_DATABASE=inventario-ikusi

# Configuración de Servidor
PORT=3000
JWT_SECRET=escribe_aqui_una_clave_larga_y_aleatoria_por_seguridad
NODE_ENV=production

# URL para el funcionamiento de Frontend y Backend
BACKEND_URL=http://10.50.20.100:3000
FRONTEND_URL=http://10.50.20.100

# Origen exacto desde el que se accede por navegador (sin barra final).
# En producción es obligatorio: fuera de localhost/192.168.x.x, CORS rechaza
# cualquier origen que no esté en esta lista.
CORS_ORIGINS=http://10.50.20.100
```

> [!TIP]
> En Producción es vital cambiar la clave `DB_PASSWORD` por algo seguro y poner un `JWT_SECRET` totalmente nuevo. 
> Además, los usuarios de tu empresa accederán a `http://10.50.20.100` desde sus navegadores.

> [!IMPORTANT]
> **Sobre el JWT_SECRET:** Por seguridad, esta variable fue removida por completo del archivo `docker-compose.yml`. Esto significa que **es estrictamente obligatorio** incluirla en este archivo `.env`. Si olvidas ponerla, el comando de Docker arrojará un error de seguridad y el proyecto no se encenderá.

---

## 4. Encender en Producción

Con todo configurado, el proceso para prender la aplicación es el mismo de siempre.
Ejecuta:

```bash
docker-compose up -d --build
```

Docker hará lo siguiente:
1. Levantará el servicio de base de datos con las contraseñas de producción que pusiste en el `.env`.
2. Compilará el backend.
3. Compilará el frontend **inyectándole** la IP definitiva (`VITE_API_URL`) para que tu página web sepa que el backend está en la IP de Nutanix.
4. Levantará el Nginx exponiendo todo en el puerto 80.

---

## 5. Mantenimiento y Actualizaciones Futuras

Si en el futuro haces cambios en el código y quieres actualizar tu máquina en Nutanix, solo debes hacer 3 comandos:

1. Bajar los cambios nuevos desde Git:
   ```bash
   git pull origin main
   ```
2. Reconstruir los contenedores para aplicar los cambios y levantarlos:
   ```bash
   docker-compose up -d --build
   ```
   *(Tus datos, los archivos subidos y la base de datos no se borrarán al hacer esto).*

¡Listo! Así de sencillo es desplegar y mantener tu aplicación en Producción usando Docker.
