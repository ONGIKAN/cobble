import fs from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const ROOT = import.meta.dirname;
const REPO = path.resolve(ROOT, '../..');
const pkg = (name: string) => path.join(REPO, 'packages', name, 'src', 'index.ts');
const rootPkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8')) as { version: string };
const channel = process.env.VITE_CHANNEL === 'beta' ? 'beta' : 'stable';

export default defineConfig({
  root: ROOT,
  base: './',
  define: {
    __COBBOX_VERSION__: JSON.stringify(rootPkg.version),
    __COBBOX_CHANNEL__: JSON.stringify(channel),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@cobbox/project': pkg('project'),
      '@cobbox/i18n': pkg('i18n'),
      '@cobbox/blocks': pkg('blocks'),
      '@cobbox/runtime': pkg('runtime'),
      '@cobbox/engine-phaser': pkg('engine-phaser'),
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
