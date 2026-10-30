import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AssetDef } from '@cobble/project';
import { useEditorStore } from '../store';
import { readSettings } from '../settings';
import { NumberInput } from './NumberInput';
import { uploadToAsset, type UploadAsset } from '../uploads';

export function Inspector() {
  const { t } = useTranslation();
  const project = useEditorStore((state) => state.project);
  const selectedSpriteId = useEditorStore((state) => state.selectedSpriteId);
  const updateSprite = useEditorStore((state) => state.updateSprite);
  const addCostume = useEditorStore((state) => state.addCostume);
  const renameCostume = useEditorStore((state) => state.renameCostume);
  const removeCostume = useEditorStore((state) => state.removeCostume);
  const moveCostume = useEditorStore((state) => state.moveCostume);
  const addSound = useEditorStore((state) => state.addSound);
  const renameSound = useEditorStore((state) => state.renameSound);
  const removeSound = useEditorStore((state) => state.removeSound);
  const removeSprite = useEditorStore((state) => state.removeSprite);
  const [previewing, setPreviewing] = useState<string | null>(null);

  const sprite = project.sprites.find((item) => item.id === selectedSpriteId);

  const assetOf = (assetId: string): AssetDef | undefined =>
    project.assets.find((asset) => asset.id === assetId);

  const upload = async (file: File | undefined, apply: (asset: UploadAsset) => void): Promise<void> => {
    if (!file) return;
    const result = await uploadToAsset(file);
    if (!result.ok) {
      window.alert(t(`upload.${result.reason}`));
      return;
    }
    apply(result.asset);
  };

  const playSound = (assetId: string): void => {
    const asset = assetOf(assetId);
    if (!asset?.dataUrl) return;
    const audio = new Audio(asset.dataUrl);
    setPreviewing(assetId);
    audio.onended = () => setPreviewing((current) => (current === assetId ? null : current));
    audio.onerror = () => setPreviewing(null);
    void audio.play().catch(() => setPreviewing(null));
  };

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
          data-testid="sprite-name"
          value={sprite.name}
          onChange={(event) => updateSprite(sprite.id, { name: event.target.value })}
        />
      </label>

      <div className="field-grid">
        <label className="field">
          <span className="field-label">{t('inspector.x')}</span>
          <NumberInput
            className="field-input mono"
            value={sprite.x}
            min={-10000}
            max={10000}
            onCommit={(value) => updateSprite(sprite.id, { x: value })}
          />
        </label>
        <label className="field">
          <span className="field-label">{t('inspector.y')}</span>
          <NumberInput
            className="field-input mono"
            value={sprite.y}
            min={-10000}
            max={10000}
            onCommit={(value) => updateSprite(sprite.id, { y: value })}
          />
        </label>
        <label className="field">
          <span className="field-label">{t('inspector.rotation')}</span>
          <NumberInput
            className="field-input mono"
            value={sprite.rotation}
            min={-3600}
            max={3600}
            onCommit={(value) => updateSprite(sprite.id, { rotation: value })}
          />
        </label>
        <label className="field">
          <span className="field-label">{t('inspector.size')}</span>
          <NumberInput
            className="field-input mono"
            value={sprite.size}
            min={1}
            max={1000}
            onCommit={(value) => updateSprite(sprite.id, { size: value })}
          />
        </label>
        <label className="field">
          <span className="field-label">{t('inspector.zIndex')}</span>
          <NumberInput
            className="field-input mono"
            value={sprite.zIndex}
            min={0}
            max={10000}
            onCommit={(value) => updateSprite(sprite.id, { zIndex: value })}
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
        <label className="mini-btn">
          {t('upload.image')}
          <input
            type="file"
            accept="image/*"
            hidden
            data-testid="costume-add-input"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              void upload(file, (asset) => addCostume(sprite.id, asset));
            }}
          />
        </label>
      </div>
      <ul className="asset-list">
        {sprite.costumes.map((costume, index) => {
          const url = assetOf(costume.assetId)?.dataUrl;
          return (
            <li className="asset-row" key={`${costume.assetId}-${index}`} data-testid={`costume-row-${index}`}>
              <span
                className="asset-thumb"
                style={url ? { backgroundImage: `url("${url}")` } : undefined}
              />
              <input
                className="field-input asset-name"
                value={costume.name}
                data-testid={`costume-name-${index}`}
                onChange={(event) => renameCostume(sprite.id, index, event.target.value)}
              />
              <button
                type="button"
                className="icon-btn"
                title={t('sprites.moveUp')}
                data-testid={`costume-up-${index}`}
                onClick={() => moveCostume(sprite.id, index, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="icon-btn"
                title={t('sprites.moveDown')}
                data-testid={`costume-down-${index}`}
                onClick={() => moveCostume(sprite.id, index, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="icon-btn icon-danger"
                title={t('sprites.remove')}
                data-testid={`costume-remove-${index}`}
                disabled={sprite.costumes.length <= 1}
                onClick={() => removeCostume(sprite.id, index)}
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>

      <div className="panel-head">
        <span className="panel-label">{t('inspector.sounds')}</span>
        <label className="mini-btn">
          {t('upload.audio')}
          <input
            type="file"
            accept="audio/*"
            hidden
            data-testid="sound-add-input"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              void upload(file, (asset) => addSound(sprite.id, asset));
            }}
          />
        </label>
      </div>
      {sprite.sounds.length === 0 ? (
        <p className="empty-hint">{t('inspector.none')}</p>
      ) : (
        <ul className="asset-list">
          {sprite.sounds.map((sound) => (
            <li className="asset-row" key={sound.id} data-testid={`sound-row-${sound.id}`}>
              <button
                type="button"
                className="icon-btn"
                title={t('sprites.playSound')}
                data-testid={`sound-play-${sound.id}`}
                onClick={() => playSound(sound.assetId)}
              >
                {previewing === sound.assetId ? '■' : '▶'}
              </button>
              <input
                className="field-input asset-name"
                value={sound.name}
                onChange={(event) => renameSound(sprite.id, sound.id, event.target.value)}
              />
              <button
                type="button"
                className="icon-btn icon-danger"
                title={t('sprites.remove')}
                data-testid={`sound-remove-${sound.id}`}
                onClick={() => removeSound(sprite.id, sound.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="inspector-actions">
        <button
          type="button"
          className="btn btn-danger"
          data-testid="delete-sprite"
          disabled={project.sprites.length <= 1}
          onClick={() => {
            const settings = readSettings();
            if (!settings.confirmDelete || window.confirm(t('sprites.confirmDelete'))) removeSprite(sprite.id);
          }}
        >
          {t('sprites.delete')}
        </button>
      </div>
    </aside>
  );
}
