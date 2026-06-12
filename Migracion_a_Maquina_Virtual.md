# Guía Definitiva: Despliegue en Máquina Virtual (Ubuntu)

Esta guía está diseñada paso a paso, asumiendo que es tu primera vez configurando un servidor. Sigue las instrucciones al pie de la letra. Se asume que tu Máquina Virtual (VM) usa el sistema operativo **Ubuntu Linux** (el más común).

---

## Parte 1: Preparación del Servidor

### 1. Conectarse a la Máquina
Abre tu terminal en Windows (PowerShell) o CMD y conéctate usando SSH. Te pedirán la contraseña de tu servidor:
```bash
ssh usuario@DIRECCION_IP_DE_TU_MAQUINA
```
*(Cambia `usuario` y `DIRECCION_IP_DE_TU_MAQUINA` por los datos que te dio tu proveedor).*

### 2. Actualizar el sistema
Una vez dentro, ejecuta este comando para actualizar todo el software del servidor:
```bash
sudo apt update && sudo apt upgrade -y
```

### 3. Instalar Node.js (El motor del sistema)
Vamos a instalar Node.js versión 20:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```
Para comprobar que se instaló correctamente, escribe:
```bash
node -v
```

### 4. Instalar PM2 (Para mantener el servidor encendido)
PM2 es un programa que asegura que tu backend se ejecute en segundo plano y se reinicie solo si falla o si se reinicia la máquina:
```bash
sudo npm install pm2 -g
```

---

## Parte 2: Base de Datos (PostgreSQL)

### 1. Instalar PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib -y
```

### 2. Configurar el usuario y la base de datos
Entraremos a la consola especial de la base de datos:
```bash
sudo -u postgres psql
```

Una vez dentro (el texto a la izquierda cambiará a `postgres=#`), ejecuta estos 3 comandos uno por uno para crear tu base de datos y usuario:
```sql
CREATE DATABASE "inventario-ikusi";
ALTER USER postgres WITH ENCRYPTED PASSWORD 'secret';
GRANT ALL PRIVILEGES ON DATABASE "inventario-ikusi" TO postgres;
```
*(Para salir de la consola, escribe `\q` y presiona Enter).*

---

## Parte 3: Subir el Código al Servidor

La forma más fácil de llevar el código a tu servidor es mediante GitHub.

### 1. Instalar Git
```bash
sudo apt install git -y
```

### 2. Clonar tu repositorio
Clona el proyecto en tu servidor:
```bash
git clone https://github.com/cristhian-lara/Inventario-ITAM.git
cd Inventario-ITAM
```

---

## Parte 4: Levantar el Backend (El Cerebro)

### 1. Instalar dependencias
Dentro de la carpeta `Inventario-ITAM`, ejecuta:
```bash
npm install
```

### 2. Crear el archivo `.env`
Necesitamos crear las variables de entorno. Ejecuta:
```bash
nano .env
```
Se abrirá un editor de texto. Pega lo siguiente dentro:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=secret
DB_DATABASE=inventario-ikusi
PORT=3000
```
*(Para guardar y salir: Presiona `Ctrl + O`, luego `Enter`, y finalmente `Ctrl + X`).*

### 3. Iniciar el Backend con PM2
Ejecuta los siguientes comandos para arrancar y guardar el proceso:
```bash
pm2 start npm --name "backend-itam" -- run start
pm2 save
pm2 startup
```
*(El último comando `pm2 startup` te dará un texto largo, **cópialo y pégalo** en la terminal para que se active cuando la máquina se reinicie).*

Para ver si funciona, escribe: `pm2 logs` (para salir presiona `Ctrl + C`).

---

## Parte 5: Preparar y Levantar el Frontend (La Interfaz)

El frontend requiere un pequeño ajuste antes de desplegarse, ya que necesita saber cuál es la IP de la máquina para conectarse al backend en lugar de buscarlo en tu "localhost" local.

### 1. Preparar las variables del Frontend
Entra a la carpeta del frontend:
```bash
cd frontend
```

Instala las dependencias:
```bash
npm install
```

Crea el archivo `.env`:
```bash
nano .env.production
```
Pega esto dentro, reemplazando la IP por la IP real de tu máquina virtual:
```env
VITE_API_URL=http://DIRECCION_IP_DE_TU_MAQUINA:3000
```
*(Guarda con `Ctrl + O`, `Enter` y sal con `Ctrl + X`).*

*(Nota: Deberemos hacer un pequeño ajuste en el código actual para que el frontend lea esta variable. ¡Yo puedo hacerlo por ti en un momento si me lo permites!)*

### 2. Construir la versión de producción
```bash
npm run build
```
Esto creará una carpeta llamada `dist` con los archivos optimizados.

---

## Parte 6: NGINX (El Portero)

Necesitamos un programa que tome esos archivos del frontend (carpeta `dist`) y los muestre en internet a través del puerto 80 (el puerto web normal).

### 1. Instalar NGINX
```bash
sudo apt install nginx -y
```

### 2. Configurar NGINX
Abre la configuración:
```bash
sudo nano /etc/nginx/sites-available/default
```

Borra TODO el contenido de ese archivo e inserta esto:
*(Asegúrate de cambiar `usuario` por tu nombre de usuario de la máquina en la ruta `root`)*

```nginx
server {
    listen 80;
    server_name _;

    # Ruta a tu carpeta dist del frontend
    root /home/usuario/Inventario-ITAM/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Redirigir el trafico API al backend local (Puerto 3000)
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Redirigir PDFs
    location /pdfs/ {
        proxy_pass http://localhost:3000;
    }
}
```
*(Guarda con `Ctrl + O`, `Enter` y sal con `Ctrl + X`).*

### 3. Reiniciar NGINX
Finalmente, reinicia el servicio web:
```bash
sudo systemctl restart nginx
```

---

¡Felicidades! 🎉 
Si visitas en tu navegador `http://DIRECCION_IP_DE_TU_MAQUINA`, ya deberías poder ver el sistema funcionando perfectamente en producción.

---

## Parte 7: Acceso Global (Internet) usando Ngrok

Para que tu sistema pueda ser accedido desde cualquier dispositivo (celular, laptop en otra red) sin configurar tu módem, usaremos **Ngrok**, que nos dará una URL pública gratuita.

### 1. Crear una cuenta en Ngrok
1. Ve a [https://dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup) y regístrate gratuitamente.
2. Una vez en el panel (Dashboard), ve al menú lateral izquierdo, haz clic en **"Domains"** y luego en **"Create Domain"** (si está disponible, de lo contrario Ngrok generará uno al arrancar). Ngrok te asignará un dominio estático gratuito (ej. `tu-nombre.ngrok-free.app`). Cópialo.
3. En el menú principal de Ngrok, busca tu **Authtoken** (Suele estar en *Your Authtoken* o en *Getting Started*).

### 2. Instalar Ngrok en tu Máquina Virtual
Vuelve a la terminal de tu máquina virtual y pega todo este bloque de código (presiona Enter al final):

```bash
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
  | sudo tee /etc/apt/keyrings/ngrok.asc >/dev/null \
  && echo "deb [signed-by=/etc/apt/keyrings/ngrok.asc] https://ngrok-agent.s3.amazonaws.com buster main" \
  | sudo tee /etc/apt/sources.list.d/ngrok.list \
  && sudo apt update \
  && sudo apt install ngrok
```

### 3. Configurar tu cuenta
Usa tu token para vincular tu máquina con tu cuenta de Ngrok (reemplaza `TU_TOKEN_AQUI` con tu token real):
```bash
ngrok config add-authtoken TU_TOKEN_AQUI
```

### 4. Actualizar el Frontend con tu nueva URL
Tu sistema frontend debe saber que ahora la API vive en la nueva URL pública (en vez de usar tu IP local).

1. Abre el archivo `.env.production` en la carpeta del frontend:
```bash
nano ~/Inventario-ITAM/frontend/.env.production
```
2. Reemplaza la línea para usar tu nuevo dominio de Ngrok:
```env
VITE_API_URL=https://TU_DOMINIO_NGROK.ngrok-free.app
```
*(Guarda con `Ctrl + O`, `Enter` y sal con `Ctrl + X`).*

3. Como cambiamos la variable, debes re-construir el frontend:
```bash
cd ~/Inventario-ITAM/frontend
npm run build
```

### 5. Lanzar el Túnel de Ngrok en segundo plano
Ya que NGINX está corriendo en tu puerto 80, le diremos a Ngrok que exponga ese puerto hacia tu dominio de manera permanente usando PM2:

1. Crea un pequeño script de arranque:
```bash
nano ~/start_ngrok.sh
```
2. Pega esto adentro (reemplaza tu dominio):
```bash
#!/bin/bash
ngrok http --domain=TU_DOMINIO_NGROK.ngrok-free.app 80
```
*(Guarda y sal con `Ctrl+O`, `Enter`, `Ctrl+X`).*

3. Dale permisos de ejecución:
```bash
chmod +x ~/start_ngrok.sh
```

4. Árranquelo con PM2 para que siempre esté activo:
```bash
pm2 start ~/start_ngrok.sh --name "ngrok-tunnel"
pm2 save
```

¡Listo! A partir de ahora, puedes ingresar a `https://TU_DOMINIO_NGROK.ngrok-free.app` desde tu celular en la calle o compartirlo con tu equipo, y entrarán directamente a tu máquina virtual.
