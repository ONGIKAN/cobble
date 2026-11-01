/**
 * 原生壳（Android）启动适配：
 * - 隐藏系统状态栏，避免遮挡编辑器顶部菜单；
 * - 关闭 WebView 覆盖状态栏，避免内容被系统栏压住。
 * Web / 桌面端直接返回，不做任何处理。
 */

type CapacitorGlobal = { isNativePlatform?: () => boolean };

export async function setupNativeShell(): Promise<void> {
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  if (!cap?.isNativePlatform?.()) return;

  document.documentElement.classList.add('is-native-shell');

  try {
    const { StatusBar } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.hide();
  } catch {
    // 忽略：未安装插件或当前平台不支持
  }

  // 系统返回键：编辑器内先回到工程管理页，工程管理页再退出应用
  try {
    const { App } = await import('@capacitor/app');
    await App.addListener('backButton', () => {
      const event = new CustomEvent('cobbox:native-back', { cancelable: true });
      const handled = !window.dispatchEvent(event);
      if (handled) return;
      if (location.hash.startsWith('#/editor/')) {
        location.hash = '#/projects';
      } else {
        void App.exitApp();
      }
    });
  } catch {
    // 忽略：未安装插件
  }
}
