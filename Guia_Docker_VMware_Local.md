# Guía para Dummies: Dockerizar y Correr el Proyecto en VMware (Local)

¡Hola! Esta guía está diseñada para que puedas ejecutar todo tu proyecto (Base de Datos, Backend y Frontend) usando Docker en tu máquina virtual de VMware (rama `dev`), sin necesidad de tener conocimientos previos de Docker. 

Ya he creado los archivos necesarios (`Dockerfile` para el backend, `frontend/Dockerfile`, `frontend/nginx.conf` y `docker-compose.yml`) en tu proyecto. Solo debes seguir estos pasos:

## 1. Instalar Docker y Docker Compose en tu Máquina Virtual VMware

Primero necesitamos tener las herramientas instaladas. Como tu máquina es Ubuntu Server, Docker funciona de manera nativa y muy rápida.
Abre una terminal y ejecuta estos comandos uno por uno:
```bash
# Actualizar el sistema
sudo apt update

# Instalar Docker
sudo apt install -y docker.io docker-compose

# Iniciar el servicio y hacer que arranque al prender la máquina
sudo systemctl enable --now docker

# Darte permisos para no tener que usar 'sudo' siempre (opcional pero recomendado)
sudo usermod -aG docker $USER
```
*(Si agregaste los permisos, cierra sesión y vuelve a entrar o reinicia la máquina para que apliquen).*

---

## 2. Configurar la URL de tu Máquina Virtual

Tu frontend necesita saber a qué dirección (IP) enviarle las peticiones al backend. 
Como estás en una máquina virtual, debes averiguar la IP de esa máquina Ubuntu Server en VMware.
Abre la terminal de Ubuntu y escribe `ip a` o `hostname -I` para obtener tu IP (ej: `192.168.1.50`). 

Vamos a crear un archivo en la raíz de tu proyecto (donde está el archivo `docker-compose.yml`) llamado `.env` (si ya tienes uno, simplemente ábrelo y edítalo). Asegúrate de que las variables `BACKEND_URL` y `FRONTEND_URL` tengan la IP de tu máquina VMware.

Ejemplo de lo que debes poner o modificar en tu `.env`:
```env
BACKEND_URL=http://192.168.1.50:3000
FRONTEND_URL=http://192.168.1.50
```
*(Reemplaza `192.168.1.50` por la IP real de tu VMware)*

> [!IMPORTANT]
> Si solo vas a acceder al sistema desde el navegador dentro de la misma máquina virtual, puedes usar `http://localhost:3000` y `http://localhost`. Pero si quieres acceder desde el Windows físico (el "host" de VMware), DEBES poner la IP de la máquina VMware.

---

## 3. ¡Encender todo con Docker!

Abre una terminal y ubícate en la carpeta principal de tu proyecto (donde está el archivo `docker-compose.yml`).

Ejecuta el siguiente comando:
```bash
docker-compose up -d --build
```

**¿Qué hace este comando?**
- `-d`: Corre los contenedores en segundo plano (para que puedas seguir usando la terminal).
- `--build`: Lee tu código, instala las librerías (npm install) y empaqueta tu backend y frontend en "imágenes" frescas.
- Además, descarga automáticamente la base de datos PostgreSQL.

Este proceso tomará un par de minutos la primera vez, ya que tiene que descargar cosas de internet. ¡Ten paciencia!

---

## 4. Validar que todo funcione

Una vez que termine de cargar, abre un navegador web (ya sea en la VMware o en tu máquina física si pusiste la IP correcta) y entra a:

- **Frontend (La página web):** `http://<IP-DE-VMWARE>` o `http://localhost` (no hace falta poner el puerto 80).
- **Backend (Para probar que el API responde):** `http://<IP-DE-VMWARE>:3000` o `http://localhost:3000`.

Si ves la página de login de tu inventario, **¡Felicidades! Has dockerizado tu proyecto con éxito.**

---

## 5. Comandos útiles (por si algo sale mal o quieres apagarlo)

Siempre que ejecutes estos comandos, asegúrate de estar en la carpeta de tu proyecto.

- **Apagar todo:** 
  ```bash
  docker-compose down
  ```
  *(Tus datos de la base de datos NO se perderán, están seguros en una carpeta llamada `pgdata` gracias al "volumen" que configuramos).*

- **Ver si todo está corriendo:**
  ```bash
  docker-compose ps
  ```

- **Ver los logs (errores, console.logs, etc):**
  Para ver qué está pasando en el backend:
  ```bash
  docker logs itam-backend -f
  ```
  *(Presiona `Ctrl + C` para salir de los logs).*

- **Actualizar si cambiaste código:**
  Si editas tu código en la rama `dev`, para que los cambios se reflejen en Docker debes reconstruirlo:
  ```bash
  docker-compose up -d --build
  ```

¡Eso es todo! Realiza todas las pruebas que requieras en esta máquina. Cuando estés lista, revisa la guía `Guia_Docker_Nutanix_Produccion.md`.
