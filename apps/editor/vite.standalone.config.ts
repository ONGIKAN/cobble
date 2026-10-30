import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// 单独构建「单文件导出」用的播放器包（IIFE，无 external 依赖，便于整段内联进一个 HTML）。
export default defineConfig({
  build: {
    outDir: 'dist-standalone',
    emptyOutDir: true,
    target: 'es2020',
    lib: {
      entry: fileURLToPath(new URL('./src/standalone/main.ts', import.meta.url)),
      formats: ['iife'],
      name: 'CobblePlayer',
      fileName: () => 'cobble-player.js',
    },
  },
});
