import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { detectLocale, LOCALE_STORAGE_KEY, switchLocale, type Locale } from '@cobbox/i18n';
import { loadLibrary } from '../library';
import { useSettings } from '../settings';
import { APP_CHANNEL, APP_VERSION, IS_BETA } from '../version';
import { REPO_URL, SITE_URL } from '../links';
import { AiSettingsPanel } from './AiDialog';
import type { SettingsTab } from '../settings-dialog';

interface Props {
  open: boolean;
  initialTab?: SettingsTab;
  onClose: () => void;
}

type Tab = SettingsTab;
const THEME_KEY = 'cobbox.theme';

/** 应用设置：语言/主题、编辑器行为、本地数据、关于与检查更新 */
export function SettingsDialog({ open, initialTab = 'general', onClose }: Props) {
  if (!open) return null;
  return <SettingsBody onClose={onClose} initialTab={initialTab} />;
}

function SettingsBody({ onClose, initialTab }: { onClose: () => void; initialTab: SettingsTab }) {
  const { t } = useTranslation();
  const settings = useSettings();
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => setTab(initialTab), [initialTab]);
  const [dataInfo] = useState(() => readDataInfo());
  const [updateState, setUpdateState] = useState<'idle' | 'checking' | 'latest' | 'available' | 'failed'>('idle');
  const [remoteVersion, setRemoteVersion] = useState('');
  const locale = useMemo(() => detectLocale(), []);

  const theme = (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark') as 'light' | 'dark';

  const switchTheme = (next: 'light' | 'dark'): void => {
    localStorage.setItem(THEME_KEY, next);
    document.documentElement.dataset.theme = next;
    location.reload();
  };

  const exportAll = (): void => {
    const library = loadLibrary();
    const payload = {
      format: 'cobbox-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      projects: library,
    };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cobbox-projects-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const clearAll = (): void => {
    if (!window.confirm(t('settings.clearConfirm'))) return;
    localStorage.removeItem('cobbox.library');
    localStorage.removeItem('cobbox.autosave');
    location.hash = '#/projects';
    location.reload();
  };

  const checkUpdate = async (): Promise<void> => {
    setUpdateState('checking');
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}version.json`, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { version?: string };
      const latest = data.version ?? '';
      setRemoteVersion(latest);
      setUpdateState(compareVersion(latest, APP_VERSION) > 0 ? 'available' : 'latest');
    } catch {
      setUpdateState('failed');
    }
  };

  return (
    <div className="modal-overlay" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal modal-settings" role="dialog" aria-modal="true" data-testid="settings-dialog">
        <div className="modal-head">
          <div>
            <h2>{t('settings.title')}</h2>
            <p className="modal-sub">{t('settings.subtitle')}</p>
          </div>
          <button type="button" className="modal-close" data-testid="settings-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-tabs" role="tablist">
          {(['general', 'editor', 'ai', 'data', 'about'] as Tab[]).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              className={`modal-tab${tab === item ? ' is-active' : ''}`}
              data-testid={`settings-tab-${item}`}
              onClick={() => setTab(item)}
            >
              {t(`settings.tab.${item}`)}
            </button>
          ))}
        </div>

        <div className="modal-body settings-body">
          {tab === 'general' && (
            <>
              <section className="settings-section">
                <h3>{t('settings.language')}</h3>
                <div className="settings-row">
                  <div className="settings-text">
                    <p>{t('settings.languageHint')}</p>
                  </div>
                  <div className="seg-group">
                    {(['zh-CN', 'en'] as Locale[]).map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`seg-btn${locale === item ? ' is-active' : ''}`}
                        data-testid={`settings-lang-${item}`}
                        onClick={() => switchLocale(item)}
                      >
                        {item === 'zh-CN' ? '中文' : 'English'}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="settings-section">
                <h3>{t('settings.theme')}</h3>
                <div className="settings-row">
                  <div className="settings-text">
                    <p>{t('settings.themeHint')}</p>
                  </div>
                  <div className="seg-group">
                    <button
                      type="button"
                      className={`seg-btn${theme === 'light' ? ' is-active' : ''}`}
                      data-testid="settings-theme-light"
                      onClick={() => switchTheme('light')}
                    >
                      {t('settings.themeLight')}
                    </button>
                    <button
                      type="button"
                      className={`seg-btn${theme === 'dark' ? ' is-active' : ''}`}
                      data-testid="settings-theme-dark"
                      onClick={() => switchTheme('dark')}
                    >
                      {t('settings.themeDark')}
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}

          {tab === 'editor' && (
            <>
              <section className="settings-section">
                <h3>{t('settings.editor')}</h3>
                <label className="settings-row settings-check">
                  <div className="settings-text">
                    <strong>{t('settings.autosave')}</strong>
                    <p>{t('settings.autosaveHint')}</p>
                  </div>
                  <input
                    type="checkbox"
                    data-testid="settings-autosave"
                    checked={settings.autosave}
                    onChange={(event) => settings.update({ autosave: event.target.checked })}
                  />
                </label>
                <label className="settings-row settings-range">
                  <div className="settings-text">
                    <strong>{t('settings.autosaveDelay')}</strong>
                    <p>{t('settings.autosaveDelayHint', { ms: settings.autosaveDelay })}</p>
                  </div>
                  <input
                    type="range"
                    min={150}
                    max={1500}
                    step={50}
                    value={settings.autosaveDelay}
                    data-testid="settings-autosave-delay"
                    onChange={(event) => settings.update({ autosaveDelay: Number(event.target.value) })}
                  />
                </label>
                <label className="settings-row settings-check">
                  <div className="settings-text">
                    <strong>{t('settings.gridSnap')}</strong>
                    <p>{t('settings.gridSnapHint')}</p>
                  </div>
                  <input
                    type="checkbox"
                    data-testid="settings-grid-snap"
                    checked={settings.gridSnap}
                    onChange={(event) => settings.update({ gridSnap: event.target.checked })}
                  />
                </label>
                <label className="settings-row settings-check">
                  <div className="settings-text">
                    <strong>{t('settings.confirmDelete')}</strong>
                    <p>{t('settings.confirmDeleteHint')}</p>
                  </div>
                  <input
                    type="checkbox"
                    data-testid="settings-confirm-delete"
                    checked={settings.confirmDelete}
                    onChange={(event) => settings.update({ confirmDelete: event.target.checked })}
                  />
                </label>
              </section>
              <section className="settings-section">
                <button
                  type="button"
                  className="btn ghost"
                  data-testid="settings-reset"
                  onClick={() => settings.resetSettings()}
                >
                  {t('settings.reset')}
                </button>
              </section>
            </>
          )}

          {tab === 'ai' && <AiSettingsPanel />}

          {tab === 'data' && (
            <>
              <section className="settings-section">
                <h3>{t('settings.data')}</h3>
                <div className="settings-row">
                  <div className="settings-text">
                    <strong>{t('settings.projects', { count: dataInfo.count })}</strong>
                    <p>{t('settings.dataSize', { size: formatSize(dataInfo.bytes) })}</p>
                  </div>
                  <button type="button" className="btn ghost" data-testid="settings-export-all" onClick={exportAll}>
                    {t('settings.exportAll')}
                  </button>
                </div>
                <div className="settings-row">
                  <div className="settings-text">
                    <strong>{t('settings.clear')}</strong>
                    <p>{t('settings.clearHint')}</p>
                  </div>
                  <button type="button" className="btn danger" data-testid="settings-clear-all" onClick={clearAll}>
                    {t('settings.clearAll')}
                  </button>
                </div>
                <p className="settings-foot">{t('settings.dataFoot')}</p>
              </section>
            </>
          )}

          {tab === 'about' && (
            <>
              <section className="settings-section">
                <h3>{t('settings.about')}</h3>
                <div className="settings-about-head">
                  <img className="settings-logo" src={`${import.meta.env.BASE_URL}logo.svg`} alt="" />
                  <div>
                    <strong>CobBox</strong>
                    <p>
                      v{APP_VERSION}
                      {IS_BETA ? ' · beta' : ''} · {APP_CHANNEL}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn ghost"
                    data-testid="settings-check-update"
                    onClick={() => void checkUpdate()}
                  >
                    {t('settings.checkUpdate')}
                  </button>
                </div>
                <p className="settings-update-note" data-testid="settings-update-note">
                  {updateState === 'idle' && t('settings.updateIdle')}
                  {updateState === 'checking' && t('settings.updateChecking')}
                  {updateState === 'latest' && t('settings.updateLatest')}
                  {updateState === 'available' && t('settings.updateAvailable', { version: remoteVersion })}
                  {updateState === 'failed' && t('settings.updateFailed')}
                </p>
              </section>
              <section className="settings-section">
                <h3>{t('settings.shortcuts')}</h3>
                <ul className="shortcut-list">
                  <li>
                    <kbd>Ctrl/⌘ + S</kbd>
                    <span>{t('settings.shortcutSave')}</span>
                  </li>
                  <li>
                    <kbd>Ctrl/⌘ + O</kbd>
                    <span>{t('settings.shortcutOpen')}</span>
                  </li>
                  <li>
                    <kbd>Ctrl/⌘ + E</kbd>
                    <span>{t('settings.shortcutExport')}</span>
                  </li>
                </ul>
              </section>
              <section className="settings-section">
                <div className="settings-links">
                  <a className="btn ghost" href={SITE_URL} target="_blank" rel="noreferrer">
                    {t('toolbar.website')}
                  </a>
                  <a className="btn ghost" href={REPO_URL} target="_blank" rel="noreferrer">
                    {t('toolbar.source')}
                  </a>
                </div>
                <p className="settings-foot">{t('settings.aboutFoot')}</p>
              </section>
            </>
          )}
        </div>

        <div className="modal-foot">
          <button type="button" className="btn primary" data-testid="settings-done" onClick={onClose}>
            {t('settings.done')}
          </button>
        </div>
      </div>
    </div>
  );
}

function readDataInfo(): { count: number; bytes: number } {
  try {
    const library = loadLibrary();
    return { count: library.projects.length, bytes: JSON.stringify(library).length };
  } catch {
    return { count: 0, bytes: 0 };
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function compareVersion(a: string, b: string): number {
  const pa = a.split('.').map((part) => Number(part.replace(/\D/g, '')) || 0);
  const pb = b.split('.').map((part) => Number(part.replace(/\D/g, '')) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export { LOCALE_STORAGE_KEY };
