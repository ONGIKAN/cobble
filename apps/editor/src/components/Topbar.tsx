import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { compileProject } from '@cobble/blocks';
import { switchLocale, type Locale } from '@cobble/i18n';
import { sendRun, sendStop } from '../bridge';
import { ProjectFileButtons } from './ProjectFileButtons';
import { openInputSettings } from '../input-settings';
import { updateEntry } from '../library';
import { routeToProjects } from '../routes';
import { IS_BETA } from '../version';
import { useEditorStore } from '../store';
import { REPO_URL, SITE_URL } from '../links';

export function Topbar() {
  const { t, i18n } = useTranslation();
  const project = useEditorStore((state) => state.project);
  const theme = useEditorStore((state) => state.theme);
  const running = useEditorStore((state) => state.running);
  const setTheme = useEditorStore((state) => state.setTheme);
  const setRunning = useEditorStore((state) => state.setRunning);
  const resetProject = useEditorStore((state) => state.resetProject);
  const locale: Locale = i18n.language === 'en' ? 'en' : 'zh-CN';

  useEffect(() => {
    document.title = `${project.meta.name} — Cobble Studio`;
  }, [project.meta.name]);

  const run = (): void => {
    const state = useEditorStore.getState();
    sendRun(compileProject(state.project, state.workspaces));
    setRunning(true);
  };

  const stop = (): void => {
    sendStop();
    setRunning(false);
  };

  const leaveToProjects = (): void => {
    const state = useEditorStore.getState();
    if (state.projectId) updateEntry(state.projectId, state.project, state.workspaces);
    routeToProjects();
  };

  return (
    <header className="topbar">
      <div className="brand">
        <img className="brand-logo" src={`${import.meta.env.BASE_URL}logo.svg`} alt="" />{IS_BETA ? <span className="beta-badge">BETA</span> : null}
        <div className="brand-text">
          <strong>{t('app.name')}</strong>
          <span className="brand-sub">{t('app.tagline')}</span>
        </div>
      </div>

      <div className="project-name" title={project.meta.name}>
        <span className="project-dot" />
        <span className="project-name-text">{project.meta.name}</span>
      </div>

      <nav className="site-links" aria-label={t('toolbar.website')}>
        <a href={SITE_URL} target="_blank" rel="noreferrer" data-testid="site-link">
          {t('toolbar.website')}
        </a>
        <a href={REPO_URL} target="_blank" rel="noreferrer" data-testid="repo-link">
          {t('toolbar.source')}
        </a>
      </nav>

      <div className="topbar-actions">
        <button
          type="button"
          className="btn ghost topbar-projects"
          data-testid="back-to-projects"
          onClick={leaveToProjects}
        >
          {t('hub.back')}
        </button>

        <div className="topbar-files">
          <ProjectFileButtons />
        </div>

        <button
          type="button"
          className="btn ghost topbar-controls"
          data-testid="input-settings"
          onClick={openInputSettings}
        >
          {t('toolbar.controls')}
        </button>

        <div className="segmented" role="group" aria-label={t('toolbar.language')}>
          <button
            type="button"
            className={`seg-btn${locale === 'zh-CN' ? ' is-on' : ''}`}
            data-testid="lang-zh"
            onClick={() => {
              if (locale !== 'zh-CN') switchLocale('zh-CN');
            }}
          >
            中文
          </button>
          <button
            type="button"
            className={`seg-btn${locale === 'en' ? ' is-on' : ''}`}
            data-testid="lang-en"
            onClick={() => {
              if (locale !== 'en') switchLocale('en');
            }}
          >
            EN
          </button>
        </div>

        <button
          type="button"
          className="btn btn-ghost"
          data-testid="theme-toggle"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? t('toolbar.themeLight') : t('toolbar.themeDark')}
        </button>

        <button type="button" className="btn btn-ghost" data-testid="reset-project" onClick={resetProject}>
          {t('toolbar.reset')}
        </button>

        <div className="run-group">
          <button type="button" className="btn btn-run" data-testid="run" onClick={run}>
            {t('toolbar.run')}
          </button>
          <button type="button" className="btn btn-stop" data-testid="stop" onClick={stop} disabled={!running}>
            {t('toolbar.stop')}
          </button>
        </div>
      </div>
    </header>
  );
}
