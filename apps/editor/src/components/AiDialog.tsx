import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AiError,
  DEFAULT_AI_CONFIG,
  buildGameFromSpec,
  designGame,
  hasAiConfig,
  readAiConfig,
  saveAiConfig,
  testAiConnection,
  type AiConfig,
  type AiErrorCode,
  type GameSpec,
} from '../ai';
import { openSettings } from '../settings-dialog';
import { useEditorStore } from '../store';

type AiState = 'idle' | 'loading' | 'error' | 'done';

const EXAMPLE_KEYS = ['ai.example1', 'ai.example2', 'ai.example3'];

/** 顶栏 / 设置面板共用的 AI 创作弹窗 */
export function AiDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <AiBody onClose={onClose} />;
}

function AiBody({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [config] = useState<AiConfig>(() => readAiConfig());
  const [prompt, setPrompt] = useState('');
  const [state, setState] = useState<AiState>('idle');
  const [error, setError] = useState('');
  const [spec, setSpec] = useState<GameSpec | null>(null);
  const replaceProject = useEditorStore((store) => store.replaceProject);
  const ready = hasAiConfig(config);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const generate = async (): Promise<void> => {
    if (!ready || !prompt.trim() || state === 'loading') return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState('loading');
    setError('');
    try {
      const designed = await designGame(config, prompt.trim(), controller.signal);
      setSpec(designed);
      setState('done');
      const built = buildGameFromSpec(designed);
      const ok = window.confirm(t('ai.confirmCreate', { title: designed.title }));
      if (ok) replaceProject(built.project, built.workspaces);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setState('error');
      setError(describeError(cause, t));
    }
  };

  return (
    <div
      className="modal-overlay"
      data-testid="ai-dialog"
      onPointerDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="modal modal-ai" role="dialog" aria-modal="true" aria-label={t('ai.title')}>
        <div className="modal-head">
          <div>
            <h2>{t('ai.title')}</h2>
            <p className="modal-sub">{t('ai.subtitle')}</p>
          </div>
          <button type="button" className="modal-close" data-testid="ai-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {!ready ? (
            <section className="ai-notice" data-testid="ai-not-configured">
              <strong>{t('ai.notConfigured')}</strong>
              <p>{t('ai.notConfiguredHint')}</p>
              <div className="ai-notice-actions">
                <button
                  type="button"
                  className="btn btn-run"
                  data-testid="ai-go-settings"
                  onClick={() => {
                    onClose();
                    openSettings({ tab: 'ai' });
                  }}
                >
                  {t('ai.goSettings')}
                </button>
              </div>
            </section>
          ) : (
            <>
              <div className="ai-config-line">
                <span className="mono">{config.model}</span>
                <span className="panel-meta mono">{config.baseUrl}</span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  data-testid="ai-change-settings"
                  onClick={() => {
                    onClose();
                    openSettings({ tab: 'ai' });
                  }}
                >
                  {t('ai.changeSettings')}
                </button>
              </div>
              <label className="field">
                <span className="field-label">{t('ai.promptLabel')}</span>
                <textarea
                  className="field-input ai-prompt"
                  data-testid="ai-prompt"
                  rows={4}
                  placeholder={t('ai.placeholder')}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                />
              </label>
              <div className="ai-examples">
                {EXAMPLE_KEYS.map((key) => (
                  <button key={key} type="button" className="btn btn-ghost" onClick={() => setPrompt(t(key))}>
                    {t(key)}
                  </button>
                ))}
              </div>
              <div className="ai-actions">
                <button
                  type="button"
                  className="btn btn-run"
                  data-testid="ai-generate"
                  disabled={state === 'loading' || !prompt.trim()}
                  onClick={() => void generate()}
                >
                  {state === 'loading' ? t('ai.generating') : t('ai.generate')}
                </button>
                <span className="panel-meta">{t('ai.tip')}</span>
              </div>
              {state === 'error' ? (
                <p className="ai-error" data-testid="ai-error">
                  {error}
                </p>
              ) : null}
              {state === 'done' && spec ? (
                <p className="ai-done" data-testid="ai-done">
                  {t('ai.done', { title: spec.title })}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function describeError(cause: unknown, t: (key: string) => string): string {
  if (cause instanceof AiError) {
    const map: Record<AiErrorCode, string> = {
      'no-config': 'ai.notConfigured',
      network: 'ai.errorNetwork',
      http: cause.status === 401 || cause.status === 403 ? 'ai.errorAuth' : 'ai.errorHttp',
      format: 'ai.errorFormat',
    };
    const base = t(map[cause.code]);
    return cause.message && cause.code !== 'no-config' ? `${base}（${cause.message}）` : base;
  }
  return t('ai.errorUnknown');
}

/** 设置 → AI 面板 */
export function AiSettingsPanel() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<AiConfig>(() => readAiConfig());
  const [status, setStatus] = useState<'idle' | 'saved' | 'testing' | 'ok' | 'fail'>('idle');
  const [message, setMessage] = useState('');

  const update = (patch: Partial<AiConfig>): void => setConfig((prev) => ({ ...prev, ...patch }));

  const save = (): void => {
    saveAiConfig(config);
    setStatus('saved');
    setMessage('');
  };

  const test = async (): Promise<void> => {
    saveAiConfig(config);
    setStatus('testing');
    setMessage('');
    try {
      await testAiConnection(config);
      setStatus('ok');
    } catch (cause) {
      setStatus('fail');
      setMessage(describeError(cause, t));
    }
  };

  return (
    <section className="settings-section" data-testid="settings-ai">
      <h3>{t('ai.settingsTitle')}</h3>
      <p className="settings-hint">{t('ai.settingsHint')}</p>
      <label className="field">
        <span className="field-label">{t('ai.baseUrl')}</span>
        <input
          className="field-input mono"
          data-testid="ai-base-url"
          placeholder={DEFAULT_AI_CONFIG.baseUrl}
          value={config.baseUrl}
          onChange={(event) => update({ baseUrl: event.target.value })}
        />
      </label>
      <label className="field">
        <span className="field-label">{t('ai.apiKey')}</span>
        <input
          className="field-input mono"
          data-testid="ai-api-key"
          type="password"
          autoComplete="off"
          placeholder="sk-..."
          value={config.apiKey}
          onChange={(event) => update({ apiKey: event.target.value })}
        />
      </label>
      <label className="field">
        <span className="field-label">{t('ai.model')}</span>
        <input
          className="field-input mono"
          data-testid="ai-model"
          placeholder={DEFAULT_AI_CONFIG.model}
          value={config.model}
          onChange={(event) => update({ model: event.target.value })}
        />
      </label>
      <div className="settings-row">
        <div className="settings-text">
          <p>{t('ai.keyHint')}</p>
          {status === 'saved' ? <p className="ai-ok">{t('ai.saved')}</p> : null}
          {status === 'testing' ? <p>{t('ai.testing')}</p> : null}
          {status === 'ok' ? <p className="ai-ok">{t('ai.testOk')}</p> : null}
          {status === 'fail' ? <p className="ai-error">{message || t('ai.testFail')}</p> : null}
        </div>
        <div className="ai-settings-actions">
          <button type="button" className="btn btn-ghost" data-testid="ai-test" onClick={() => void test()} disabled={!hasAiConfig(config) || status === 'testing'}>
            {t('ai.test')}
          </button>
          <button type="button" className="btn btn-run" data-testid="ai-save" onClick={save} disabled={!hasAiConfig(config)}>
            {t('ai.save')}
          </button>
        </div>
      </div>
    </section>
  );
}
