# Dockerfile para el Backend
FROM node:20-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies porque usamos ts-node)
RUN npm install

# Copiar el resto del código del backend
COPY . .

# Exponer el puerto donde corre el backend
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["npm", "run", "start"]
