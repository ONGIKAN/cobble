/**
 * 从旧品牌 Cobble Studio 迁移本地数据到 CobBox：
 * 先把 cobble.* 的键复制成 cobbox.*（目标不存在时），再保留旧键不删，方便回退。
 */
const OLD_PREFIX = 'cobble.';
const NEW_PREFIX = 'cobbox.';
const KEYS = [
  'library',
  'autosave',
  'theme',
  'locale',
  'settings',
  'panes',
  'ai',
];

try {
  for (const key of KEYS) {
    const next = `${NEW_PREFIX}${key}`;
    if (localStorage.getItem(next) === null) {
      const previous = localStorage.getItem(`${OLD_PREFIX}${key}`);
      if (previous !== null) localStorage.setItem(next, previous);
    }
  }
} catch {
  // localStorage 不可用时静默跳过
}
