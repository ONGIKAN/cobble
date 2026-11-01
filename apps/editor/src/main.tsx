import './storage-migrate';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { detectLocale, initI18n } from '@cobbox/i18n';
import { App } from './App';
import { ProjectHub } from './components/ProjectHub';
import { parseRoute, routeToProjects, type Route } from './routes';
import { THEME_KEY } from './store';
import { syncDesktopLibrary } from './library';
import { setupNativeShell } from './native-shell';
import { SettingsDialog } from './components/SettingsDialog';
import { onSettings, type SettingsTab } from './settings-dialog';
import { AiDialog } from './components/AiDialog';
import { onAi } from './ai-dialog';
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
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('general');
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    void syncDesktopLibrary().then((changed) => {
      if (changed) setLibraryRevision((value) => value + 1);
    });
  }, []);

  useEffect(
    () =>
      onSettings((open, options) => {
        if (!open) return;
        setSettingsTab(options?.tab ?? 'general');
        setSettingsOpen(true);
      }),
    [],
  );

  useEffect(() => onAi((open) => { if (open) setAiOpen(true); }), []);

  useEffect(() => {
    if (!location.hash) routeToProjects();
    const onHash = (): void => setRoute(parseRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <>
      {route.view === 'editor' ? <App projectId={route.projectId} /> : <ProjectHub key={libraryRevision} />}
      <SettingsDialog open={settingsOpen} initialTab={settingsTab} onClose={() => setSettingsOpen(false)} />
      <AiDialog open={aiOpen} onClose={() => setAiOpen(false)} />
    </>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('缺少 #root 挂载点');

createRoot(rootElement).render(<Root />);
