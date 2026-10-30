import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { switchLocale, type Locale } from '@cobble/i18n';
import { downloadProject, readProjectFile } from '../project-file';
import {
  createEntry,
  deleteEntry,
  deleteNative,
  duplicateEntry,
  entryThumb,
  findEntry,
  loadLibrary,
  mirrorNative,
  relativeTime,
  renameEntry,
  type ProjectEntry,
} from '../library';
import { isDesktopApp, nativeProjectsLocation } from '../native';
import { routeToEditor } from '../routes';
import { CHANGELOG_URL, REPO_URL, SITE_URL } from '../links';
import { APP_VERSION, IS_BETA } from '../version';
import { useEditorStore } from '../store';
import type { TemplateDefinition } from '../templates';
import { NewProjectDialog } from './NewProjectDialog';
import { openSettings } from '../settings-dialog';

/** 工程管理页：软件启动后的首页，管理浏览器里保存的所有工程 */
export function ProjectHub() {
  const { t, i18n } = useTranslation();
  const theme = useEditorStore((state) => state.theme);
  const setTheme = useEditorStore((state) => state.setTheme);
  const locale: Locale = i18n.language === 'en' ? 'en' : 'zh-CN';
  const [entries, setEntries] = useState<ProjectEntry[]>(() => loadLibrary().projects);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [query, setQuery] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  const [storePath, setStorePath] = useState('');

  const refresh = (): void => setEntries(loadLibrary().projects);

  useEffect(() => {
    if (!isDesktopApp()) return;
    void nativeProjectsLocation()
      .then(setStorePath)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    document.title = `Cobble Studio — ${t('hub.title')}`;
  }, [t]);

  const createFromTemplate = (template: TemplateDefinition): void => {
    const entry = createEntry(template.project(), {}, template.id);
    void mirrorNative(entry);
    routeToEditor(entry.id);
  };

  const onImport = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    const result = await readProjectFile(file);
    if (!result.ok) {
      window.alert(t('toolbar.badFile'));
      return;
    }
    const entry = createEntry(result.value.project, result.value.workspaces);
    void mirrorNative(entry);
    routeToEditor(entry.id);
  };

  const filtered = entries.filter((entry) =>
    entry.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="hub">
      <header className="hub-topbar">
        <div className="brand">
          <img className="brand-logo" src={`${import.meta.env.BASE_URL}logo.svg`} alt="" />
          <div className="brand-text">
            <strong>{t('app.name')}</strong>
            <span className="brand-sub">{t('app.tagline')}</span>
          </div>
        </div>

        <nav className="site-links" aria-label={t('toolbar.website')}>
          <a href={SITE_URL} target="_blank" rel="noreferrer">
            {t('toolbar.website')}
          </a>
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            {t('toolbar.source')}
          </a>
        </nav>

        <div className="hub-top-actions">
          <div className="segmented" role="group" aria-label={t('toolbar.language')}>
            <button
              type="button"
              className={`seg-btn${locale === 'zh-CN' ? ' is-on' : ''}`}
              data-testid="hub-lang-zh"
              onClick={() => {
                if (locale !== 'zh-CN') switchLocale('zh-CN');
              }}
            >
              中文
            </button>
            <button
              type="button"
              className={`seg-btn${locale === 'en' ? ' is-on' : ''}`}
              data-testid="hub-lang-en"
              onClick={() => {
                if (locale !== 'en') switchLocale('en');
              }}
            >
              EN
            </button>
          </div>
          <button
            type="button"
            className="btn ghost"
            data-testid="hub-theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? t('toolbar.themeLight') : t('toolbar.themeDark')}
          </button>
        </div>
      </header>

      <main className="hub-main">
        <div className="hub-head">
          <div>
            <h1>{IS_BETA ? <span className="beta-badge">BETA</span> : null}{t('hub.title')}</h1>
            <p className="hub-sub">
              {t('hub.subtitle', { count: entries.length })}
            </p>
          </div>
          <div className="hub-actions">
            <input
              className="field-input hub-search"
              data-testid="hub-search"
              placeholder={t('hub.search')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button
              type="button"
              className="btn"
              data-testid="hub-import"
              onClick={() => importRef.current?.click()}
            >
              {t('hub.open')}
            </button>
            <input
              ref={importRef}
              type="file"
              hidden
              accept=".gproj,application/json"
              onChange={(event) => {
                void onImport(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
            <button type="button" className="btn" data-testid="hub-settings" onClick={openSettings}>
              {t('toolbar.settings')}
            </button>
            <button
              type="button"
              className="btn primary"
              data-testid="hub-new"
              onClick={() => setDialogOpen(true)}
            >
              {t('hub.new')}
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="hub-empty" data-testid="hub-empty">
            <p>{entries.length === 0 ? t('hub.empty') : t('hub.noMatch')}</p>
            <button type="button" className="btn primary" onClick={() => setDialogOpen(true)}>
              {t('hub.new')}
            </button>
          </div>
        ) : (
          <div className="project-grid">
            {filtered.map((entry) => (
              <ProjectCard
                key={entry.id}
                entry={entry}
                locale={locale}
                onOpen={() => routeToEditor(entry.id)}
                onChange={refresh}
              />
            ))}
          </div>
        )}

        <footer className="hub-foot">
          <span>
            {t('hub.footNote')}
            {storePath && <span className="hub-store mono">{storePath}</span>}
          </span>
          <span className="hub-community">
            <a
              className="status-link"
              href="mqqapi://card/show_pslcard?src_type=internal&version=1&uin=424124959&card_type=group&source=qrcode"
              data-testid="hub-qq-group"
              title={t('hub.joinQqHint')}
            >
              {t('hub.joinQq')} 424124959
            </a>
            <span className="hub-community-sep">·</span>
            <span>{t('hub.douyinGroup')} 888985597118</span>
          </span>
          <span className="hub-version mono">
            v{APP_VERSION} ·{' '}
            <a className="status-link" href={CHANGELOG_URL} target="_blank" rel="noreferrer" data-testid="hub-changelog-link">
              {t('toolbar.changelog')}
            </a>
          </span>
        </footer>
      </main>

      <NewProjectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreate={createFromTemplate} />
    </div>
  );
}

function ProjectCard({
  entry,
  locale,
  onOpen,
  onChange,
}: {
  entry: ProjectEntry;
  locale: Locale;
  onOpen: () => void;
  onChange: () => void;
}) {
  const { t } = useTranslation();
  const thumb = entryThumb(entry);

  const rename = (): void => {
    const name = window.prompt(t('hub.rename'), entry.name);
    if (name === null) return;
    renameEntry(entry.id, name);
    void mirrorNative(findEntry(entry.id));
    onChange();
  };

  const duplicate = (): void => {
    const copy = duplicateEntry(entry.id);
    void mirrorNative(copy);
    onChange();
  };

  const remove = (): void => {
    if (!window.confirm(t('hub.confirmDelete', { name: entry.name }))) return;
    deleteEntry(entry.id);
    void deleteNative(entry.id);
    onChange();
  };

  return (
    <article className="project-card" data-testid={`project-card-${entry.id}`}>
      <button type="button" className="project-open" data-testid={`project-open-${entry.id}`} onClick={onOpen}>
        <span className="project-thumb">
          {thumb ? <img src={thumb} alt="" /> : <span className="project-thumb-mark">CB</span>}
        </span>
        <span className="project-body">
          <span className="project-title">{entry.name}</span>
          <span className="project-meta">
            {countBlocks(entry) > 0
              ? t('hub.meta', { sprites: entry.project.sprites.length, blocks: countBlocks(entry) })
              : t('hub.metaSprites', { sprites: entry.project.sprites.length })}{' '}
            · {relativeTime(entry.updatedAt, locale)}
          </span>
        </span>
      </button>

      <div className="project-tools">
        <button type="button" className="icon-btn" title={t('hub.rename')} onClick={rename}>
          ✎
        </button>
        <button type="button" className="icon-btn" title={t('hub.duplicate')} onClick={duplicate}>
          ⧉
        </button>
        <button
          type="button"
          className="icon-btn"
          title={t('hub.export')}
          onClick={() => downloadProject(entry.project, entry.workspaces)}
        >
          ⤓
        </button>
        <button type="button" className="icon-btn icon-danger" title={t('hub.delete')} onClick={remove}>
          ✕
        </button>
      </div>
    </article>
  );
}

function countBlocks(entry: ProjectEntry): number {
  return Object.values(entry.workspaces).reduce<number>((sum, state) => {
    const serialized = state as { blocks?: { blocks?: unknown[] } };
    return sum + (serialized.blocks?.blocks?.length ?? 0);
  }, 0);
}
