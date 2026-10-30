import { Runtime } from '@cobble/runtime';
import { PhaserAdapter } from '@cobble/engine-phaser';
import type { CompiledProject } from '@cobble/project';
import './player.css';

const stageNode = document.getElementById('stage');
const hudNode = document.getElementById('hud');
if (!stageNode || !hudNode) throw new Error('缺少播放器容器');

const stage: HTMLElement = stageNode;
const embedTouch = new URLSearchParams(window.location.search).get('touch') !== '0';
const hud: HTMLElement = hudNode;

interface Session {
  adapter: PhaserAdapter;
  runtime: Runtime;
}

let session: Session | null = null;
let hudTimer: number | undefined;

function post(message: unknown): void {
  window.parent?.postMessage(message, '*');
}

function renderHud(): void {
  if (!session) return;
  // 以下划线开头的变量是模板内部用的辅助变量（例如贪吃蛇的尾部历史），不显示在 HUD
  const variables = session.runtime.getVariables().filter((variable) => !variable.name.startsWith('_'));
  hud.replaceChildren(
    ...variables.map((variable) => {
      const item = document.createElement('span');
      item.className = 'hud-var';
      const name = document.createElement('span');
      name.className = 'hud-name';
      name.textContent = variable.name;
      const value = document.createElement('span');
      value.className = 'hud-value';
      value.textContent = String(variable.value);
      item.append(name, value);
      return item;
    }),
  );
}

function destroySession(notify: boolean): void {
  if (!session) return;
  session.runtime.stop();
  session.adapter.destroy();
  session = null;
  window.clearInterval(hudTimer);
  hud.replaceChildren();
  (window as unknown as { __cobbleRuntime?: Runtime }).__cobbleRuntime = undefined;
  if (notify) post({ type: 'stopped' });
}

async function run(project: CompiledProject): Promise<void> {
  // 切换/重开时静默销毁旧会话，避免旧会话的 stopped 消息把新会话的「运行中」状态冲掉
  destroySession(false);
  const adapter = new PhaserAdapter();
  let runtime: Runtime | null = null;
  await adapter.init(stage, project, {
    mountTouch: embedTouch,
    onDrag: (spriteId, x, y) => runtime?.setSpritePosition(spriteId, x, y),
  });
  runtime = new Runtime(adapter, project);
  runtime.start();
  session = { adapter, runtime };
  (window as unknown as { __cobbleRuntime?: Runtime }).__cobbleRuntime = runtime;
  window.clearInterval(hudTimer);
  hudTimer = window.setInterval(renderHud, 200);
  renderHud();
  post({ type: 'playing' });
}

function stop(): void {
  destroySession(true);
}

window.addEventListener('message', (event: MessageEvent) => {
  const data = event.data as { type?: string; project?: CompiledProject } | null;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'run' && data.project) {
    void run(data.project);
  } else if (data.type === 'stop') {
    stop();
  } else if (data.type === 'touch') {
    const bindings = (data as { bindings?: unknown }).bindings;
    if (session && Array.isArray(bindings)) {
      session.runtime.setTouchBindings(bindings.filter((item): item is string => typeof item === 'string'));
    }
  }
});

post({ type: 'ready' });
