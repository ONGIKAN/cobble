import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { detectLocale, initI18n } from '@cobble/i18n';
import { App } from './App';
import { ProjectHub } from './components/ProjectHub';
import { parseRoute, routeToProjects, type Route } from './routes';
import { THEME_KEY } from './store';
import { syncDesktopLibrary } from './library';
import { setupNativeShell } from './native-shell';
import { SettingsDialog } from './components/SettingsDialog';
import { onSettings } from './settings-dialog';
import './styles/global.css';

void setupNativeShell();

const locale = detectLocale();
initI18n(locale);
document.documentElement.lang = locale;

const storedTheme = localStorage.getItem(THEME_KEY);
document.documentElement.dataset.theme = storedTheme === 'light' ? 'light' : 'dark';

function Root() {
  const [route, setRoute] = useState<Route>(() => parseRoute());
  const [libraryRevision, setLibraryRevision] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    void syncDesktopLibrary().then((changed) => {
      if (changed) setLibraryRevision((value) => value + 1);
    });
  }, []);

  useEffect(() => onSettings((open) => { if (open) setSettingsOpen(true); }), []);

  useEffect(() => {
    if (!location.hash) routeToProjects();
    const onHash = (): void => setRoute(parseRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <>
      {route.view === 'editor' ? <App projectId={route.projectId} /> : <ProjectHub key={libraryRevision} />}
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('缺少 #root 挂载点');

createRoot(rootElement).render(<Root />);
