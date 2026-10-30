import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { displayName, inputConfig, keyLabel, type InputConfig } from '@cobble/project';
import { refreshAssetBlocks } from '../block-defs';
import { useEditorStore } from '../store';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** 输入设置：把操作抽象成输入事件（可绑定多个按键），并配置触屏摇杆/按钮 */
export function InputSettingsDialog({ open, onClose }: Props) {
  if (!open) return null;
  return <DialogBody onClose={onClose} />;
}

function DialogBody({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const project = useEditorStore((state) => state.project);
  const updateInput = useEditorStore((state) => state.updateInput);
  const initial = useMemo(() => cloneInput(inputConfig(project)), [project]);
  const [config, setConfig] = useState<InputConfig>(initial);
  const [capturing, setCapturing] = useState<string | null>(null);

  useEffect(() => {
    if (!capturing) return;
    const onKey = (event: KeyboardEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      const code = event.code;
      setConfig((current) => ({
        ...current,
        bindings: current.bindings.map((binding) =>
          binding.id === capturing && !binding.keys.includes(code)
            ? { ...binding, keys: [...binding.keys, code] }
            : binding,
        ),
      }));
      setCapturing(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [capturing]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [onClose]);

  const save = (): void => {
    updateInput(config);
    refreshAssetBlocks();
    onClose();
  };

  const addBinding = (): void => {
    const id = `input_${Date.now().toString(36)}`;
    setConfig((current) => ({
      ...current,
      bindings: [
        ...current.bindings,
        { id, name: t('inputs.defaultName', { index: current.bindings.length + 1 }), keys: [] },
      ],
    }));
  };

  const removeBinding = (id: string): void => {
    setConfig((current) => ({
      ...current,
      bindings: current.bindings.filter((binding) => binding.id !== id),
      buttons: current.buttons.filter((button) => button.bindingId !== id),
    }));
  };

  const addButton = (): void => {
    const id = `btn_${Date.now().toString(36)}`;
    setConfig((current) => ({
      ...current,
      buttons: [
        ...current.buttons,
        {
          id,
          label: t('inputs.defaultName', { index: current.buttons.length + 1 }),
          bindingId: current.bindings[0]?.id ?? '',
        },
      ],
    }));
  };

  return (
    <div className="modal-overlay" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal modal-inputs" role="dialog" aria-modal="true" data-testid="input-settings-dialog">
        <div className="modal-head">
          <div>
            <h2>{t('inputs.title')}</h2>
            <p className="modal-sub">{t('inputs.subtitle')}</p>
          </div>
          <button type="button" className="modal-close" data-testid="input-settings-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <section className="input-section">
            <div className="input-section-head">
              <h3>{t('inputs.bindings')}</h3>
              <button type="button" className="mini-btn" data-testid="add-input-binding" onClick={addBinding}>
                ＋
              </button>
            </div>
            <ul className="binding-list">
              {config.bindings.map((binding) => (
                <li key={binding.id} className="binding-row" data-testid="binding-row">
                  <input
                    className="field-input binding-name"
                    value={displayName(binding.name, (key) => String(t(key)))}
                    data-testid={`binding-name-${binding.id}`}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        bindings: current.bindings.map((item) =>
                          item.id === binding.id ? { ...item, name: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                  <div className="binding-keys">
                    {binding.keys.map((code) => (
                      <span key={code} className="key-chip">
                        {keyLabel(code)}
                        <button
                          type="button"
                          className="key-chip-remove"
                          data-testid={`binding-key-${binding.id}-${code}`}
                          onClick={() =>
                            setConfig((current) => ({
                              ...current,
                              bindings: current.bindings.map((item) =>
                                item.id === binding.id
                                  ? { ...item, keys: item.keys.filter((key) => key !== code) }
                                  : item,
                              ),
                            }))
                          }
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      className={`mini-btn${capturing === binding.id ? ' is-capturing' : ''}`}
                      data-testid={`add-key-${binding.id}`}
                      onClick={() => setCapturing(binding.id)}
                    >
                      {capturing === binding.id ? t('inputs.pressKey') : t('inputs.addKey')}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="icon-btn icon-danger"
                    data-testid={`remove-binding-${binding.id}`}
                    title={t('inputs.removeBinding')}
                    onClick={() => removeBinding(binding.id)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="input-section">
            <h3>{t('inputs.touch')}</h3>
            <div className="input-section-head">
              <h4>{t('inputs.touchMode')}</h4>
            </div>
            <div className="input-mode-row" data-testid="input-touch-mode">
              <button
                type="button"
                className={`seg-btn${(config.touchMode ?? 'pad') === 'pad' ? ' is-active' : ''}`}
                data-testid="touch-mode-pad"
                onClick={() => setConfig((current) => ({ ...current, touchMode: 'pad' }))}
              >
                {t('inputs.modePad')}
              </button>
              <button
                type="button"
                className={`seg-btn${(config.touchMode ?? 'pad') === 'direct' ? ' is-active' : ''}`}
                data-testid="touch-mode-direct"
                onClick={() => setConfig((current) => ({ ...current, touchMode: 'direct' }))}
              >
                {t('inputs.modeDirect')}
              </button>
            </div>

            <div className="input-size-row">
              <label className="check-row">
                <span>{t('inputs.sizes')}</span>
              </label>
              <select
                className="field-input"
                data-testid="input-joystick-size"
                value={config.joystickSize ?? 'md'}
                onChange={(event) =>
                  setConfig((current) => ({ ...current, joystickSize: event.target.value as InputConfig['joystickSize'] }))
                }
              >
                <option value="sm">{t('inputs.sizeSm')}</option>
                <option value="md">{t('inputs.sizeMd')}</option>
                <option value="lg">{t('inputs.sizeLg')}</option>
              </select>
              <select
                className="field-input"
                data-testid="input-button-size"
                value={config.buttonSize ?? 'md'}
                onChange={(event) =>
                  setConfig((current) => ({ ...current, buttonSize: event.target.value as InputConfig['buttonSize'] }))
                }
              >
                <option value="sm">{t('inputs.sizeSm')}</option>
                <option value="md">{t('inputs.sizeMd')}</option>
                <option value="lg">{t('inputs.sizeLg')}</option>
              </select>
            </div>

            {(config.touchMode ?? 'pad') === 'pad' && (
              <label className="check-row">
                <input
                  type="checkbox"
                  data-testid="input-joystick"
                  checked={config.joystick}
                  onChange={(event) => setConfig((current) => ({ ...current, joystick: event.target.checked }))}
                />
                <span>{t('inputs.joystick')}</span>
              </label>
            )}

            {(config.touchMode ?? 'pad') === 'pad' && (
              <>
                <div className="input-section-head">
                  <h4>{t('inputs.buttons')}</h4>
                  <button type="button" className="mini-btn" data-testid="add-touch-button" onClick={addButton}>
                    ＋
                  </button>
                </div>
                <ul className="binding-list">
              {config.buttons.map((button) => (
                <li key={button.id} className="binding-row touch-row" data-testid="touch-button-row">
                  <input
                    className="field-input"
                    value={displayName(button.label, (key) => String(t(key)))}
                    data-testid={`touch-button-label-${button.id}`}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        buttons: current.buttons.map((item) =>
                          item.id === button.id ? { ...item, label: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                  <select
                    className="field-input"
                    value={button.bindingId}
                    data-testid={`touch-button-binding-${button.id}`}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        buttons: current.buttons.map((item) =>
                          item.id === button.id ? { ...item, bindingId: event.target.value } : item,
                        ),
                      }))
                    }
                  >
                    {config.bindings.map((binding) => (
                      <option key={binding.id} value={binding.id}>
                        {displayName(binding.name, (key) => String(t(key)))}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="icon-btn icon-danger"
                    data-testid={`remove-touch-button-${button.id}`}
                    onClick={() =>
                      setConfig((current) => ({
                        ...current,
                        buttons: current.buttons.filter((item) => item.id !== button.id),
                      }))
                    }
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
              </>
            )}
          </section>
        </div>

        <div className="modal-foot">
          <button type="button" className="btn ghost" onClick={onClose}>
            {t('inputs.close')}
          </button>
          <button type="button" className="btn primary" data-testid="input-settings-save" onClick={save}>
            {t('inputs.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

function cloneInput(input: InputConfig): InputConfig {
  return {
    joystick: input.joystick,
    joystickSize: input.joystickSize ?? 'md',
    buttonSize: input.buttonSize ?? 'md',
    touchMode: input.touchMode ?? 'pad',
    bindings: input.bindings.map((binding) => ({ ...binding, keys: [...binding.keys] })),
    buttons: input.buttons.map((button) => ({ ...button })),
  };
}
