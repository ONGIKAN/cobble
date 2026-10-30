import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { detectLocale, initI18n } from '@cobble/i18n';
import { App } from './App';
import { ProjectHub } from './components/ProjectHub';
import { parseRoute, routeToProjects, type Route } from './routes';
import { THEME_KEY } from './store';
import './styles/global.css';

const locale = detectLocale();
initI18n(locale);
document.documentElement.lang = locale;

const storedTheme = localStorage.getItem(THEME_KEY);
document.documentElement.dataset.theme = storedTheme === 'light' ? 'light' : 'dark';

function Root() {
  const [route, setRoute] = useState<Route>(() => parseRoute());

  useEffect(() => {
    if (!location.hash) routeToProjects();
    const onHash = (): void => setRoute(parseRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (route.view === 'editor') return <App projectId={route.projectId} />;
  return <ProjectHub />;
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('缺少 #root 挂载点');

createRoot(rootElement).render(<Root />);
