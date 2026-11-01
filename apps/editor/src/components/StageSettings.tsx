import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../store';
import { NumberInput } from './NumberInput';

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
  const preset = PRESETS.find(([width, height]) => width === stage.width && height === stage.height);

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
              value={preset ? value : 'custom'}
              onChange={(event) => {
                if (event.target.value === 'custom') return;
                const [width, height] = event.target.value.split('x').map(Number);
                updateStage({ width, height });
              }}
            >
              {PRESETS.map(([width, height]) => (
                <option key={`${width}x${height}`} value={`${width}x${height}`}>
                  {width} × {height}
                </option>
              ))}
              <option value="custom">{t('stage.customSize')}</option>
            </select>
          </label>
          <div className="stage-size-custom">
            <label className="field">
              <span className="field-label">{t('stage.width')}</span>
              <NumberInput
                className="field-input mono"
                value={stage.width}
                onCommit={(width) => updateStage({ width: Math.min(3840, Math.max(160, Math.round(width))) })}
                min={160}
                max={3840}
                ariaLabel={t('stage.width')}
                testId="stage-width"
              />
            </label>
            <label className="field">
              <span className="field-label">{t('stage.height')}</span>
              <NumberInput
                className="field-input mono"
                value={stage.height}
                onCommit={(height) => updateStage({ height: Math.min(2160, Math.max(90, Math.round(height))) })}
                min={90}
                max={2160}
                ariaLabel={t('stage.height')}
                testId="stage-height"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
