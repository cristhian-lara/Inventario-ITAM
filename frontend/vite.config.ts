import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Los bundles se emiten en /static en vez de /assets para no colisionar con
    // la ruta de la app "/assets" (Catálogo). Con la carpeta por defecto "assets",
    // al recargar en /assets nginx servía esa carpeta física (sin index.html) y
    // devolvía 403. Sacándola de en medio, try_files cae a index.html y React
    // Router maneja la ruta.
    assetsDir: 'static',
  },
  server: {
    // Respeta el puerto asignado por el entorno (PORT); por defecto 5173
    port: Number(process.env.PORT) || 5173,
  },
})
