// 官网语言切换：中文默认，选择持久化到 localStorage。
const STORAGE_KEY = 'gf.lang';
const SUPPORTED = ['zh-CN', 'en'];

const detect = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && SUPPORTED.includes(saved)) return saved;
  const languages = navigator.languages ?? [navigator.language ?? ''];
  return languages.some((lang) => lang.toLowerCase().startsWith('zh')) ? 'zh-CN' : 'en';
};

// 版本日志日期：记录真实发布日期，浏览器打开时自动换算为「今天 / 昨天 / 七天内 / 七天之前」，站点无需每天更新。
const parseDay = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const bucketLabel = (diff, lang) => {
  if (lang === 'zh-CN') {
    if (diff <= 0) return '今天';
    if (diff === 1) return '昨天';
    if (diff <= 7) return '七天内';
    return '七天之前';
  }
  if (diff <= 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff <= 7) return 'within 7 days';
  return 'more than 7 days ago';
};

const renderReleaseDates = (lang) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let previousDate = '';
  document.querySelectorAll('.release').forEach((release) => {
    const node = release.querySelector('.release-date [data-date]');
    if (!node) return;
    const raw = node.dataset.date;
    if (!raw) return;
    const date = parseDay(raw);
    const diff = Math.round((today - date) / 86400000);
    const wrap = node.closest('.release-date');
    if (raw === previousDate) {
      // 相同发布日期的连续版本只显示一次
      node.textContent = '';
      if (wrap) wrap.style.display = 'none';
    } else {
      node.textContent = bucketLabel(diff, lang);
      if (wrap) wrap.style.display = '';
    }
    previousDate = raw;
  });
};

const apply = (lang) => {
  document.documentElement.lang = lang;
  const button = document.getElementById('lang-toggle');
  if (button) button.textContent = lang === 'zh-CN' ? 'EN' : '中文';
  document.title =
    lang === 'zh-CN'
      ? 'CobBox · 轻量 2D 积木游戏创作平台'
      : 'CobBox · a lightweight 2D block game maker';
  renderReleaseDates(lang);
};

let current = detect();
apply(current);

document.getElementById('lang-toggle')?.addEventListener('click', () => {
  current = current === 'zh-CN' ? 'en' : 'zh-CN';
  localStorage.setItem(STORAGE_KEY, current);
  apply(current);
});

// 官网深浅主题：默认浅色，选择持久化到 localStorage。
const THEME_KEY = 'gf.theme';
const detectTheme = () => {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return 'light';
};

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  const button = document.getElementById('theme-toggle');
  if (button) {
    const zh = button.querySelector('.zh');
    const en = button.querySelector('.en');
    if (zh) zh.textContent = theme === 'dark' ? '浅色' : '深色';
    if (en) en.textContent = theme === 'dark' ? 'Light' : 'Dark';
  }
};

let currentTheme = detectTheme();
applyTheme(currentTheme);

document.getElementById('theme-toggle')?.addEventListener('click', () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, currentTheme);
  applyTheme(currentTheme);
});
