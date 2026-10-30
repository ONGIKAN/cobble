import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../store';
import { CHANGELOG_URL, REPO_URL, SITE_URL } from '../links';
import { APP_VERSION, IS_BETA } from '../version';

export function StatusBar() {
  const { t } = useTranslation();
  const project = useEditorStore((state) => state.project);
  const savedAt = useEditorStore((state) => state.savedAt);
  const running = useEditorStore((state) => state.running);

  return (
    <footer className="statusbar">
      <span>{t('toolbar.autosave')}</span>
      <span className="status-sep">/</span>
      <span className="mono">
        {savedAt ? `${t('toolbar.saved')} ${new Date(savedAt).toLocaleTimeString()}` : t('status.local')}
      </span>
      <span className="status-sep">/</span>
      <span>{t('status.spriteCount', { count: project.sprites.length })}</span>
      <span className="status-spacer" />
      <span className={running ? 'status-run is-on' : 'status-run'}>
        {running ? t('stage.running') : t('stage.idle')}
      </span>
      <span className="status-sep">/</span>
      <a className="status-link mono" href={CHANGELOG_URL} target="_blank" rel="noreferrer" data-testid="status-changelog-link">
        v{APP_VERSION}{IS_BETA ? ' · beta' : ''}
      </a>
      <span className="status-links">
        <span className="status-sep">/</span>
        <a className="status-link" href={SITE_URL} target="_blank" rel="noreferrer" data-testid="status-site-link">
          {t('toolbar.website')}
        </a>
        <a className="status-link" href={REPO_URL} target="_blank" rel="noreferrer" data-testid="status-repo-link">
          GitHub
        </a>
      </span>
    </footer>
  );
}
