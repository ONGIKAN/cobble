import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../store';

const PRESETS: Array<[number, number]> = [
  [960, 540],
  [1280, 720],
  [640, 360],
];

/** 舞台设置：背景色与尺寸预设（尺寸改动在下一次运行时生效） */
export function StageSettings() {
  const { t } = useTranslation();
  const stage = useEditorStore((state) => state.project.stage);
  const updateStage = useEditorStore((state) => state.updateStage);
  const [open, setOpen] = useState(false);
  const value = `${stage.width}x${stage.height}`;

  return (
    <div className="stage-settings-wrap">
      <button
        type="button"
        className="mini-btn"
        data-testid="stage-settings-toggle"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {t('stage.settings')}
      </button>
      {open && (
        <div className="stage-settings" data-testid="stage-settings">
          <label className="field">
            <span className="field-label">{t('stage.background')}</span>
            <input
              className="field-input color-input"
              type="color"
              data-testid="stage-background"
              value={stage.background}
              onChange={(event) => updateStage({ background: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('stage.resize')}</span>
            <select
              className="field-input mono"
              data-testid="stage-size"
              value={value}
              onChange={(event) => {
                const [width, height] = event.target.value.split('x').map(Number);
                updateStage({ width, height });
              }}
            >
              {PRESETS.map(([width, height]) => (
                <option key={`${width}x${height}`} value={`${width}x${height}`}>
                  {width} × {height}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
