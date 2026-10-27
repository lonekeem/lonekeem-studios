import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site from /<repo>/. Override with BASE_PATH (e.g. "/" on Vercel).
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || '/lonekeem-studios/',
});
