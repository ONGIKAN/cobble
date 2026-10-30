import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'studio.cobble.app',
  appName: 'Cobble Studio',
  // 复用编辑器的生产构建（由 npm run build 生成）
  webDir: '../editor/dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
