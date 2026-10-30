import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../store';

export function Inspector() {
  const { t } = useTranslation();
  const project = useEditorStore((state) => state.project);
  const selectedSpriteId = useEditorStore((state) => state.selectedSpriteId);
  const updateSprite = useEditorStore((state) => state.updateSprite);
  const sprite = project.sprites.find((item) => item.id === selectedSpriteId);

  if (!sprite) {
    return (
      <aside className="inspector">
        <div className="panel-head">
          <span className="panel-label">{t('panels.inspector')}</span>
        </div>
        <p className="empty-hint">{t('inspector.none')}</p>
      </aside>
    );
  }

  const assetName = (assetId: string): string =>
    project.assets.find((asset) => asset.id === assetId)?.name ?? assetId;

  return (
    <aside className="inspector">
      <div className="panel-head">
        <span className="panel-label">{t('panels.inspector')}</span>
        <span className="panel-meta mono">{sprite.id}</span>
      </div>

      <label className="field">
        <span className="field-label">{t('inspector.name')}</span>
        <input
          className="field-input"
          value={sprite.name}
          onChange={(event) => updateSprite(sprite.id, { name: event.target.value })}
        />
      </label>

      <div className="field-grid">
        <label className="field">
          <span className="field-label">{t('inspector.x')}</span>
          <input
            className="field-input mono"
            type="number"
            value={sprite.x}
            onChange={(event) => updateSprite(sprite.id, { x: Number(event.target.value) || 0 })}
          />
        </label>
        <label className="field">
          <span className="field-label">{t('inspector.y')}</span>
          <input
            className="field-input mono"
            type="number"
            value={sprite.y}
            onChange={(event) => updateSprite(sprite.id, { y: Number(event.target.value) || 0 })}
          />
        </label>
        <label className="field">
          <span className="field-label">{t('inspector.rotation')}</span>
          <input
            className="field-input mono"
            type="number"
            value={sprite.rotation}
            onChange={(event) => updateSprite(sprite.id, { rotation: Number(event.target.value) || 0 })}
          />
        </label>
        <label className="field">
          <span className="field-label">{t('inspector.size')}</span>
          <input
            className="field-input mono"
            type="number"
            value={sprite.size}
            onChange={(event) => updateSprite(sprite.id, { size: Number(event.target.value) || 100 })}
          />
        </label>
        <label className="field">
          <span className="field-label">{t('inspector.zIndex')}</span>
          <input
            className="field-input mono"
            type="number"
            value={sprite.zIndex}
            onChange={(event) => updateSprite(sprite.id, { zIndex: Number(event.target.value) || 0 })}
          />
        </label>
        <label className="field field-inline">
          <span className="field-label">{t('inspector.visible')}</span>
          <input
            className="field-check"
            type="checkbox"
            checked={sprite.visible}
            onChange={(event) => updateSprite(sprite.id, { visible: event.target.checked })}
          />
        </label>
      </div>

      <div className="panel-head">
        <span className="panel-label">{t('inspector.costumes')}</span>
      </div>
      <ul className="costume-list">
        {sprite.costumes.map((costume) => (
          <li key={costume.name} className="costume-row">
            <span className="costume-swatch" />
            <span>{costume.name}</span>
            <span className="costume-asset mono">{assetName(costume.assetId)}</span>
          </li>
        ))}
      </ul>

      <div className="panel-head">
        <span className="panel-label">{t('inspector.sounds')}</span>
      </div>
      {sprite.sounds.length === 0 ? (
        <p className="empty-hint">{t('inspector.none')}</p>
      ) : (
        <ul className="costume-list">
          {sprite.sounds.map((sound) => (
            <li key={sound.id} className="costume-row">
              <span>{sound.name}</span>
              <span className="costume-asset mono">{assetName(sound.assetId)}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
