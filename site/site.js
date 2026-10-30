// 官网语言切换：中文默认，选择持久化到 localStorage。
const STORAGE_KEY = 'gf.lang';
const SUPPORTED = ['zh-CN', 'en'];

const detect = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && SUPPORTED.includes(saved)) return saved;
  const languages = navigator.languages ?? [navigator.language ?? ''];
  return languages.some((lang) => lang.toLowerCase().startsWith('zh')) ? 'zh-CN' : 'en';
};

const apply = (lang) => {
  document.documentElement.lang = lang;
  const button = document.getElementById('lang-toggle');
  if (button) button.textContent = lang === 'zh-CN' ? 'EN' : '中文';
  document.title =
    lang === 'zh-CN'
      ? 'Cobble Studio · 轻量 2D 积木游戏创作平台'
      : 'Cobble Studio · a lightweight 2D block game maker';
};

let current = detect();
apply(current);

document.getElementById('lang-toggle')?.addEventListener('click', () => {
  current = current === 'zh-CN' ? 'en' : 'zh-CN';
  localStorage.setItem(STORAGE_KEY, current);
  apply(current);
});
