import { useTranslation } from 'react-i18next';
import type { AssetDef } from '@cobble/project';
import { useEditorStore } from '../store';

function thumbUrl(asset: AssetDef | undefined): string | undefined {
  if (!asset) return undefined;
  return asset.dataUrl ?? asset.path;
}

export function SpriteRail() {
  const { t } = useTranslation();
  const project = useEditorStore((state) => state.project);
  const selectedSpriteId = useEditorStore((state) => state.selectedSpriteId);
  const selectSprite = useEditorStore((state) => state.selectSprite);

  const assetOf = (assetId: string): AssetDef | undefined => project.assets.find((asset) => asset.id === assetId);

  return (
    <aside className="rail">
      <div className="panel-head">
        <span className="panel-label">{t('panels.sprites')}</span>
        <span className="panel-meta mono">{project.sprites.length}</span>
      </div>

      <div className="sprite-list">
        {project.sprites.map((sprite) => {
          const url = thumbUrl(assetOf(sprite.costumes[0]?.assetId));
          return (
            <button
              type="button"
              key={sprite.id}
              className={`sprite-card${sprite.id === selectedSpriteId ? ' is-active' : ''}`}
              onClick={() => selectSprite(sprite.id)}
            >
              <span
                className="sprite-thumb"
                style={url ? { backgroundImage: `url("${url}")` } : undefined}
              />
              <span className="sprite-meta">
                <span className="sprite-name">{sprite.name}</span>
                <span className="sprite-sub mono">
                  {t('sprites.costumeCount', { count: sprite.costumes.length })}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="panel-head">
        <span className="panel-label">{t('panels.variables')}</span>
      </div>
      <div className="var-list">
        {project.variables.map((variable) => (
          <div className="var-row" key={variable.id}>
            <span className="var-name">{variable.name}</span>
            <span className="var-value mono">{String(variable.value)}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
