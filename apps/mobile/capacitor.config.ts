import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'studio.cobbox.app',
  appName: 'CobBox',
  // 复用编辑器的生产构建（由 npm run build 生成）
  webDir: '../editor/dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
