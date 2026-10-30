import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LIBRARY_ASSETS } from '../asset-library';
import { useEditorStore } from '../store';

/** 资源库拖拽时使用的 dataTransfer 类型 */
export const ASSET_MIME = 'application/x-cobble-asset';

type Listener = (open: boolean) => void;
const listeners = new Set<Listener>();

/** 打开资源库（顶栏 / 手机舞台栏按钮调用） */
export function openAssetLibrary(): void {
  for (const listener of listeners) listener(true);
}

export function onAssetLibrary(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AssetLibrary({ open, onClose }: Props) {
  const { t } = useTranslation();
  const project = useEditorStore((state) => state.project);
  const addSpriteFromAsset = useEditorStore((state) => state.addSpriteFromAsset);

  const projectAssets = useMemo(
    () =>
      project.assets
        .filter((asset) => asset.kind === 'image' && asset.dataUrl)
        .map((asset) => ({ id: asset.id, name: asset.name, dataUrl: asset.dataUrl! })),
    [project.assets],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const addAtCenter = (name: string, dataUrl: string): void => {
    addSpriteFromAsset({ name, dataUrl, x: 0, y: 0 });
  };

  const dragPayload = (event: React.DragEvent, name: string, dataUrl: string): void => {
    const payload = JSON.stringify({ name, dataUrl });
    event.dataTransfer.setData(ASSET_MIME, payload);
    event.dataTransfer.setData('text/plain', payload);
    event.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="asset-library-overlay" data-testid="asset-library" onPointerDown={onClose}>
      <aside className="asset-library" onPointerDown={(event) => event.stopPropagation()}>
        <header className="asset-library-head">
          <div>
            <h2>{t('library.title')}</h2>
            <p>{t('library.hint')}</p>
          </div>
          <button type="button" className="mini-btn" data-testid="asset-library-close" onClick={onClose}>
            {t('library.close')}
          </button>
        </header>

        <section>
          <h3>{t('library.builtin')}</h3>
          <div className="asset-grid">
            {LIBRARY_ASSETS.map((asset) => (
              <button
                key={asset.id}
                type="button"
                className="asset-card"
                data-testid={`asset-card-${asset.id}`}
                draggable
                title={t(asset.nameKey)}
                onDragStart={(event) => dragPayload(event, t(asset.nameKey), asset.dataUrl)}
                onClick={() => addAtCenter(t(asset.nameKey), asset.dataUrl)}
              >
                <span className="asset-card-thumb" style={{ backgroundImage: `url("${asset.dataUrl}")` }} />
                <span className="asset-card-name">{t(asset.nameKey)}</span>
              </button>
            ))}
          </div>
        </section>

        {projectAssets.length > 0 && (
          <section>
            <h3>{t('library.project')}</h3>
            <div className="asset-grid">
              {projectAssets.map((asset) => (
                <button
                  key={`proj-${asset.id}`}
                  type="button"
                  className="asset-card"
                  data-testid={`asset-card-project-${asset.id}`}
                  draggable
                  title={asset.name}
                  onDragStart={(event) => dragPayload(event, asset.name, asset.dataUrl)}
                  onClick={() => addAtCenter(asset.name, asset.dataUrl)}
                >
                  <span className="asset-card-thumb" style={{ backgroundImage: `url("${asset.dataUrl}")` }} />
                  <span className="asset-card-name">{asset.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <p className="asset-library-foot">{t('library.foot')}</p>
      </aside>
    </div>
  );
}
