import { defineConfig } from 'vite';

export default defineConfig({
  // Chemins relatifs : le build est servi tel quel par le serveur du lab (et ouvrable en file://)
  base: './',
  server: { fs: { allow: ['..'] } }, // autorise l'import de ../_shared
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    assetsInlineLimit: 0,
  },
});
