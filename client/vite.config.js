import { existsSync, readdirSync } from 'node:fs';
import { URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const photosDirectory = new URL('./public/products/', import.meta.url);
const localPhotos = existsSync(photosDirectory)
  ? readdirSync(photosDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => '/products/' + entry.name)
  : [];

const proxy = {
  '/api': 'http://localhost:4000',
  '/socket.io': { target: 'http://localhost:4000', ws: true },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __LOCAL_PRODUCT_PHOTOS__: JSON.stringify(localPhotos) },
  server: { port: 5173, strictPort: true, proxy },
  preview: { port: 5173, strictPort: true, proxy },
});
