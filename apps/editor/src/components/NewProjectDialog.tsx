import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TEMPLATES, templateThumb, type TemplateDefinition } from '../templates';
import { useEditorStore } from '../store';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 传入后由调用方负责创建工程（工程管理页用）；否则替换当前工程 */
  onCreate?: (template: TemplateDefinition) => void;
}

interface Preview {
  template: TemplateDefinition;
  thumb?: string;
  sprites: number;
  blocks: number;
}

export function NewProjectDialog({ open, onClose, onCreate }: Props) {
  if (!open) return null;
  return <DialogBody onClose={onClose} onCreate={onCreate} />;
}

function DialogBody({ onClose, onCreate }: { onClose: () => void; onCreate?: (template: TemplateDefinition) => void }) {
  const { t } = useTranslation();
  const replaceProject = useEditorStore((state) => state.replaceProject);

  const previews = useMemo<Preview[]>(
    () =>
      TEMPLATES.map((template) => {
        const project = template.project();
        return {
          template,
          thumb: templateThumb(project),
          sprites: project.sprites.length,
          blocks: template.scriptGroups,
        };
      }),
    [],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pick = (template: TemplateDefinition): void => {
    if (onCreate) {
      onCreate(template);
      return;
    }
    if (!window.confirm(t('templates.confirmReplace'))) return;
    replaceProject(template.project(), template.workspaces());
  };

  return (
    <div
      className="modal-overlay"
      data-testid="new-project-dialog"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={t('templates.title')}>
        <header className="modal-head">
          <div>
            <h2>{t('templates.title')}</h2>
            <p>{t('templates.subtitle')}</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('templates.close')}>
            ✕
          </button>
        </header>
        <div className="template-grid">
          {previews.map(({ template, thumb, sprites, blocks }) => (
            <button
              key={template.id}
              type="button"
              className="template-card"
              data-testid={`template-${template.id}`}
              onClick={() => pick(template)}
            >
              <span className="template-thumb">
                {thumb ? <img src={thumb} alt="" /> : <span className="template-thumb-mark">＋</span>}
              </span>
              <span className="template-body">
                <span className="template-name">{t(template.nameKey)}</span>
                <span className="template-tagline">{t(template.taglineKey)}</span>
                <span className="template-meta">
                  {t('templates.meta', { sprites, blocks })}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
