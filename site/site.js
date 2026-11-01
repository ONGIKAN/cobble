// 官网语言切换：中文默认，选择持久化到 localStorage。
const STORAGE_KEY = 'gf.lang';
const SUPPORTED = ['zh-CN', 'en'];

const detect = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && SUPPORTED.includes(saved)) return saved;
  const languages = navigator.languages ?? [navigator.language ?? ''];
  return languages.some((lang) => lang.toLowerCase().startsWith('zh')) ? 'zh-CN' : 'en';
};

// 版本日志日期：真实发布日期 + 浏览器自动换算相对时间（站点无需每天更新）。
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const parseDay = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const relativeLabel = (diff, lang) => {
  if (lang === 'zh-CN') {
    if (diff <= 0) return '今天';
    if (diff === 1) return '昨天';
    if (diff < 30) return `${diff} 天前`;
    if (diff < 365) return `${Math.floor(diff / 30)} 个月前`;
    return `${Math.floor(diff / 365)} 年前`;
  }
  if (diff <= 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff < 30) return `${diff} days ago`;
  if (diff < 365) return `${Math.floor(diff / 30)} months ago`;
  return `${Math.floor(diff / 365)} years ago`;
};

const renderReleaseDates = (lang) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  document.querySelectorAll('.release-date [data-date]').forEach((node) => {
    const raw = node.dataset.date;
    if (!raw) return;
    const date = parseDay(raw);
    const diff = Math.round((today - date) / 86400000);
    if (lang === 'zh-CN') {
      node.textContent = `${raw} · ${relativeLabel(diff, lang)}`;
    } else {
      node.textContent = `${MONTHS_EN[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} · ${relativeLabel(diff, lang)}`;
    }
  });
};

const apply = (lang) => {
  document.documentElement.lang = lang;
  const button = document.getElementById('lang-toggle');
  if (button) button.textContent = lang === 'zh-CN' ? 'EN' : '中文';
  document.title =
    lang === 'zh-CN'
      ? 'Cobble Studio · 轻量 2D 积木游戏创作平台'
      : 'Cobble Studio · a lightweight 2D block game maker';
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
const themeMedia = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;

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
