import { useTranslation } from 'react-i18next';
import type { AssetDef } from '@cobble/project';
import { useEditorStore } from '../store';
import { NumberInput } from './NumberInput';

function thumbUrl(asset: AssetDef | undefined): string | undefined {
  if (!asset) return undefined;
  return asset.dataUrl ?? asset.path;
}

export function SpriteRail() {
  const { t } = useTranslation();
  const project = useEditorStore((state) => state.project);
  const selectedSpriteId = useEditorStore((state) => state.selectedSpriteId);
  const selectSprite = useEditorStore((state) => state.selectSprite);
  const addSprite = useEditorStore((state) => state.addSprite);
  const addVariable = useEditorStore((state) => state.addVariable);
  const renameVariable = useEditorStore((state) => state.renameVariable);
  const removeVariable = useEditorStore((state) => state.removeVariable);
  const setVariableValue = useEditorStore((state) => state.setVariableValue);

  const assetOf = (assetId: string): AssetDef | undefined => project.assets.find((asset) => asset.id === assetId);

  return (
    <aside className="rail">
      <div className="panel-head">
        <span className="panel-label">{t('panels.sprites')}</span>
        <span className="panel-meta mono">{project.sprites.length}</span>
        <button
          type="button"
          className="mini-btn"
          data-testid="add-sprite"
          title={t('sprites.add')}
          onClick={() => addSprite()}
        >
          ＋
        </button>
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
        <button
          type="button"
          className="mini-btn"
          data-testid="add-variable"
          title={t('variables.add')}
          onClick={() => addVariable()}
        >
          ＋
        </button>
      </div>
      {project.variables.length === 0 ? (
        <p className="empty-hint">{t('inspector.none')}</p>
      ) : (
        <div className="var-list">
          {project.variables.map((variable) => (
            <div className="var-row" key={variable.id} data-testid={`var-row-${variable.id}`}>
              <input
                className="field-input var-name-input"
                value={variable.name}
                aria-label={t('variables.name')}
                data-testid={`var-name-${variable.id}`}
                onChange={(event) => renameVariable(variable.id, event.target.value)}
              />
              <NumberInput
                className="field-input mono var-value-input"
                value={typeof variable.value === 'number' ? variable.value : Number(variable.value) || 0}
                ariaLabel={t('variables.value')}
                testId={`var-value-${variable.id}`}
                onCommit={(value) => setVariableValue(variable.id, value)}
              />
              <button
                type="button"
                className="icon-btn icon-danger"
                title={t('variables.remove')}
                data-testid={`var-remove-${variable.id}`}
                onClick={() => removeVariable(variable.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
