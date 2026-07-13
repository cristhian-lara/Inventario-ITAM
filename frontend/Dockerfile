# Dockerfile para el Frontend

# Etapa 1: Construcción (Build)
FROM node:20-alpine AS build

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el código del frontend
COPY . .

# Argumento para la URL de la API (se pasará al hacer build)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Construir la aplicación para producción (Vite generará archivos estáticos en /dist)
RUN npm run build

# Etapa 2: Servidor Web (Nginx)
FROM nginx:alpine

# Copiar la configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos estáticos construidos desde la etapa 1
COPY --from=build /app/dist /usr/share/nginx/html

# Exponer el puerto 80
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
