import { useTranslation } from 'react-i18next';
import { displayName, type InputConfig, type PadSide, type PadSize, type TouchButtonDef } from '@cobble/project';

interface Props {
  config: InputConfig;
  onChange: (next: InputConfig) => void;
}

const SIZES: PadSize[] = ['sm', 'md', 'lg'];
const SIZE_PX: Record<PadSize, number> = { sm: 52, md: 76, lg: 84 };

/**
 * 触屏控件面板：摇杆与自定义按钮的详细配置（每个工程独立保存）。
 * 右侧带一个手机样式实时预览，所见即所得。
 */
export function TouchControlsPanel({ config, onChange }: Props) {
  const { t } = useTranslation();
  const mode = config.touchMode ?? 'pad';
  const joystickSide = config.joystickSide ?? 'left';
  const joystickOpacity = config.joystickOpacity ?? 55;
  const joystickSize = config.joystickSize ?? 'md';
  const defaultSize = config.buttonSize ?? 'md';

  const patch = (next: Partial<InputConfig>): void => onChange({ ...config, ...next });
  const patchButton = (id: string, next: Partial<TouchButtonDef>): void =>
    patch({ buttons: config.buttons.map((button) => (button.id === id ? { ...button, ...next } : button)) });
  const addButton = (): void => {
    const id = `btn_${Date.now().toString(36)}`;
    patch({
      buttons: [
        ...config.buttons,
        {
          id,
          label: t('inputs.defaultName', { index: config.buttons.length + 1 }),
          bindingId: config.bindings[0]?.id ?? '',
          icon: '',
          size: defaultSize,
          side: 'right',
          opacity: 62,
        },
      ],
    });
  };
  const removeButton = (id: string): void => patch({ buttons: config.buttons.filter((button) => button.id !== id) });

  const sideButtons = (side: PadSide): TouchButtonDef[] =>
    config.buttons.filter((button) => (button.side ?? 'right') === side);

  return (
    <div className="touch-panel">
      <section className="input-section">
        <h3>{t('inputs.touchMode')}</h3>
        <div className="input-mode-row" data-testid="input-touch-mode">
          <button
            type="button"
            className={`seg-btn${mode === 'pad' ? ' is-active' : ''}`}
            data-testid="touch-mode-pad"
            onClick={() => patch({ touchMode: 'pad' })}
          >
            {t('inputs.modePad')} · {t('inputs.modePadHint')}
          </button>
          <button
            type="button"
            className={`seg-btn${mode === 'direct' ? ' is-active' : ''}`}
            data-testid="touch-mode-direct"
            onClick={() => patch({ touchMode: 'direct' })}
          >
            {t('inputs.modeDirect')} · {t('inputs.modeDirectHint')}
          </button>
        </div>
      </section>

      {mode === 'pad' && (
        <>
          <section className="input-section">
            <div className="input-section-head">
              <h3>{t('inputs.joystick')}</h3>
              <label className="check-row check-inline">
                <input
                  type="checkbox"
                  data-testid="input-joystick"
                  checked={config.joystick}
                  onChange={(event) => patch({ joystick: event.target.checked })}
                />
                <span>{t('inputs.joystickEnabled')}</span>
              </label>
            </div>
            <div className="touch-config-grid">
              <label className="touch-field">
                <span>{t('inputs.side')}</span>
                <span className="seg-group">
                  <button
                    type="button"
                    className={`seg-btn${joystickSide === 'left' ? ' is-active' : ''}`}
                    data-testid="joystick-side-left"
                    onClick={() => patch({ joystickSide: 'left' })}
                  >
                    {t('inputs.sideLeft')}
                  </button>
                  <button
                    type="button"
                    className={`seg-btn${joystickSide === 'right' ? ' is-active' : ''}`}
                    data-testid="joystick-side-right"
                    onClick={() => patch({ joystickSide: 'right' })}
                  >
                    {t('inputs.sideRight')}
                  </button>
                </span>
              </label>
              <label className="touch-field">
                <span>{t('inputs.size')}</span>
                <select
                  className="field-input"
                  data-testid="input-joystick-size"
                  value={joystickSize}
                  onChange={(event) => patch({ joystickSize: event.target.value as PadSize })}
                >
                  {SIZES.map((size) => (
                    <option key={size} value={size}>
                      {t(`inputs.size${size === 'sm' ? 'Sm' : size === 'md' ? 'Md' : 'Lg'}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="touch-field touch-field-wide">
                <span>
                  {t('inputs.opacity')} · {joystickOpacity}%
                </span>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={joystickOpacity}
                  data-testid="joystick-opacity"
                  onChange={(event) => patch({ joystickOpacity: Number(event.target.value) })}
                />
              </label>
            </div>
          </section>

          <section className="input-section">
            <p className="touch-hint">{t('inputs.buttonsHint')}</p>
            <div className="input-section-head">
              <h3>{t('inputs.buttons')}</h3>
              <button type="button" className="mini-btn" data-testid="add-touch-button" onClick={addButton}>
                ＋
              </button>
            </div>
            {config.buttons.length === 0 ? (
              <p className="empty-hint">{t('inputs.buttonsEmpty')}</p>
            ) : (
              <div className="touch-card-grid">
                {config.buttons.map((button, index) => {
                  const size = button.size ?? defaultSize;
                  const px = SIZE_PX[size];
                  const opacity = button.opacity ?? 62;
                  const side = button.side ?? 'right';
                  return (
                    <article className="touch-card" key={button.id} data-testid={`touch-button-card-${button.id}`}>
                      <header className="touch-card-head">
                        <div className="touch-card-title">
                          <span className="touch-card-index">{index + 1}</span>
                          <span>{t('inputs.button')}</span>
                        </div>
                        <button
                          type="button"
                          className="icon-btn icon-danger"
                          data-testid={`remove-touch-button-${button.id}`}
                          title={t('inputs.removeTouchButton')}
                          onClick={() => removeButton(button.id)}
                        >
                          ✕
                        </button>
                      </header>

                      <div className="touch-card-preview-row">
                        <div
                          className="touch-btn-preview"
                          style={{
                            width: px,
                            height: px,
                            opacity: opacity / 100,
                            fontSize: size === 'sm' ? 12 : size === 'lg' ? 16 : 15,
                          }}
                        >
                          {button.icon ? (
                            <>
                              <span className="touch-btn-preview-icon">{button.icon}</span>
                              <span className="touch-btn-preview-label">
                                {displayName(button.label, (key) => String(t(key)))}
                              </span>
                            </>
                          ) : (
                            displayName(button.label, (key) => String(t(key)))
                          )}
                        </div>
                        <span className="touch-card-summary">
                          {t(`inputs.side${side === 'left' ? 'Left' : 'Right'}`)} ·{' '}
                          {t(`inputs.size${size === 'sm' ? 'Sm' : size === 'md' ? 'Md' : 'Lg'}`)} · {opacity}%
                        </span>
                      </div>

                      <div className="touch-card-fields">
                        <label className="touch-field">
                          <span>{t('inputs.label')}</span>
                          <input
                            className="field-input"
                            value={displayName(button.label, (key) => String(t(key)))}
                            data-testid={`touch-button-label-${button.id}`}
                            onChange={(event) => patchButton(button.id, { label: event.target.value })}
                          />
                        </label>
                        <label className="touch-field">
                          <span>{t('inputs.icon')}</span>
                          <input
                            className="field-input"
                            value={button.icon ?? ''}
                            maxLength={2}
                            placeholder={t('inputs.iconPlaceholder')}
                            data-testid={`touch-button-icon-${button.id}`}
                            onChange={(event) => patchButton(button.id, { icon: event.target.value })}
                          />
                        </label>
                        <label className="touch-field touch-field-wide">
                          <span>{t('inputs.binding')}</span>
                          <select
                            className="field-input"
                            value={button.bindingId}
                            data-testid={`touch-button-binding-${button.id}`}
                            onChange={(event) => patchButton(button.id, { bindingId: event.target.value })}
                          >
                            {config.bindings.map((binding) => (
                              <option key={binding.id} value={binding.id}>
                                {displayName(binding.name, (key) => String(t(key)))}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="touch-field">
                          <span>{t('inputs.size')}</span>
                          <select
                            className="field-input"
                            data-testid={`touch-button-size-${button.id}`}
                            value={size}
                            onChange={(event) => patchButton(button.id, { size: event.target.value as PadSize })}
                          >
                            {SIZES.map((item) => (
                              <option key={item} value={item}>
                                {t(`inputs.size${item === 'sm' ? 'Sm' : item === 'md' ? 'Md' : 'Lg'}`)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <span className="touch-field">
                          <span>{t('inputs.side')}</span>
                          <span className="seg-group">
                            <button
                              type="button"
                              className={`seg-btn${side === 'left' ? ' is-active' : ''}`}
                              data-testid={`touch-button-side-left-${button.id}`}
                              onClick={() => patchButton(button.id, { side: 'left' })}
                            >
                              {t('inputs.sideLeft')}
                            </button>
                            <button
                              type="button"
                              className={`seg-btn${side === 'right' ? ' is-active' : ''}`}
                              data-testid={`touch-button-side-right-${button.id}`}
                              onClick={() => patchButton(button.id, { side: 'right' })}
                            >
                              {t('inputs.sideRight')}
                            </button>
                          </span>
                        </span>
                        <label className="touch-field touch-field-wide">
                          <span>
                            {t('inputs.opacity')} · {opacity}%
                          </span>
                          <input
                            type="range"
                            min={10}
                            max={100}
                            step={5}
                            value={opacity}
                            data-testid={`touch-button-opacity-${button.id}`}
                            onChange={(event) => patchButton(button.id, { opacity: Number(event.target.value) })}
                          />
                        </label>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {mode === 'pad' && (
        <section className="input-section">
          <h3>{t('inputs.preview')}</h3>
          <div className="touch-preview" data-testid="touch-preview">
            <div className="touch-preview-stage">
              {config.joystick && (
                <div
                  className="touch-preview-joystick"
                  style={{
                    opacity: joystickOpacity / 100,
                    width: joystickSize === 'sm' ? 58 : joystickSize === 'lg' ? 96 : 84,
                    height: joystickSize === 'sm' ? 58 : joystickSize === 'lg' ? 96 : 84,
                    left: joystickSide === 'left' ? 10 : 'auto',
                    right: joystickSide === 'right' ? 10 : 'auto',
                  }}
                  data-testid="preview-joystick"
                >
                  <span className="touch-preview-knob" />
                </div>
              )}
              {sideButtons('right').map((button) => {
                const px = SIZE_PX[button.size ?? defaultSize];
                const previewPx = Math.round(px * 0.78);
                const sideIndex = sideButtons('right').indexOf(button);
                return (
                  <div
                    key={button.id}
                    className="touch-preview-btn"
                    style={{
                      opacity: (button.opacity ?? 62) / 100,
                      width: previewPx,
                      height: previewPx,
                      right: 10,
                      bottom: 10 + sideIndex * (previewPx + 8),
                    }}
                  >
                    {button.icon ? <span className="touch-preview-icon">{button.icon}</span> : null}
                    <span className="touch-preview-label">
                      {displayName(button.label, (key) => String(t(key)))}
                    </span>
                  </div>
                );
              })}
              {sideButtons('left').map((button) => {
                const px = SIZE_PX[button.size ?? defaultSize];
                const previewPx = Math.round(px * 0.78);
                const sideIndex = sideButtons('left').indexOf(button);
                return (
                  <div
                    key={button.id}
                    className="touch-preview-btn"
                    style={{
                      opacity: (button.opacity ?? 62) / 100,
                      width: previewPx,
                      height: previewPx,
                      left: 10,
                      bottom: 10 + sideIndex * (previewPx + 8),
                    }}
                  >
                    {button.icon ? <span className="touch-preview-icon">{button.icon}</span> : null}
                    <span className="touch-preview-label">
                      {displayName(button.label, (key) => String(t(key)))}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="touch-preview-note">{t('inputs.previewNote')}</p>
          </div>
        </section>
      )}
    </div>
  );
}
