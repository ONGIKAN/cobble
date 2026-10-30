import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const ROOT = import.meta.dirname;
const REPO = path.resolve(ROOT, '../..');
const pkg = (name: string) => path.join(REPO, 'packages', name, 'src', 'index.ts');

export default defineConfig({
  root: ROOT,
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@cobble/project': pkg('project'),
      '@cobble/i18n': pkg('i18n'),
      '@cobble/blocks': pkg('blocks'),
      '@cobble/runtime': pkg('runtime'),
      '@cobble/engine-phaser': pkg('engine-phaser'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5183,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: {
        index: path.join(ROOT, 'index.html'),
        player: path.join(ROOT, 'player.html'),
      },
    },
  },
});
