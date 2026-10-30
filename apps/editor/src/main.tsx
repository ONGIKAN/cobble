import { createRoot } from 'react-dom/client';
import { detectLocale, initI18n } from '@cobble/i18n';
import { App } from './App';
import { THEME_KEY } from './store';
import './styles/global.css';

const locale = detectLocale();
initI18n(locale);
document.documentElement.lang = locale;

const storedTheme = localStorage.getItem(THEME_KEY);
document.documentElement.dataset.theme = storedTheme === 'light' ? 'light' : 'dark';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('缺少 #root 挂载点');

createRoot(rootElement).render(<App />);
