import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { displayName, inputConfig, keyLabel, type InputConfig } from '@cobble/project';
import { refreshAssetBlocks } from '../block-defs';
import { useEditorStore } from '../store';
import { TouchControlsPanel } from './TouchControlsPanel';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Tab = 'bindings' | 'touch';

/** 输入设置：左侧把操作抽象成输入事件（可绑定多个按键），右侧是触屏控件面板 */
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
  const [tab, setTab] = useState<Tab>('bindings');

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

        <div className="modal-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'bindings'}
            className={`modal-tab${tab === 'bindings' ? ' is-active' : ''}`}
            data-testid="input-tab-bindings"
            onClick={() => setTab('bindings')}
          >
            {t('inputs.tabBindings')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'touch'}
            className={`modal-tab${tab === 'touch' ? ' is-active' : ''}`}
            data-testid="input-tab-touch"
            onClick={() => setTab('touch')}
          >
            {t('inputs.tabTouch')}
          </button>
        </div>

        <div className="modal-body">
          {tab === 'bindings' && (
            <section className="input-section">
              <div className="input-section-head">
                <div>
                  <h3>{t('inputs.bindings')}</h3>
                  <p className="touch-hint">{t('inputs.bindingsHint')}</p>
                </div>
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
          )}

          {tab === 'touch' && <TouchControlsPanel config={config} onChange={setConfig} />}
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
    joystickSide: input.joystickSide ?? 'left',
    joystickOpacity: input.joystickOpacity ?? 55,
    buttonSize: input.buttonSize ?? 'md',
    touchMode: input.touchMode ?? 'pad',
    bindings: input.bindings.map((binding) => ({ ...binding, keys: [...binding.keys] })),
    buttons: input.buttons.map((button) => ({ ...button })),
  };
}
