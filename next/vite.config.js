import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Builds into ../app so GitHub Pages (serving the repo root from main)
// exposes the next-gen client at /CAPM-Prep/app/.
export default defineConfig({
  plugins: [react()],
  base: '/CAPM-Prep/app/',
  build: {
    outDir: '../app',
    emptyOutDir: true,
  },
});
