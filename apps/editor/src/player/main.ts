import { Runtime } from '@cobble/runtime';
import { PhaserAdapter } from '@cobble/engine-phaser';
import type { CompiledProject } from '@cobble/project';
import './player.css';

const stageNode = document.getElementById('stage');
const hudNode = document.getElementById('hud');
if (!stageNode || !hudNode) throw new Error('缺少播放器容器');

const stage: HTMLElement = stageNode;
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
  const variables = session.runtime.getVariables();
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

async function run(project: CompiledProject): Promise<void> {
  stop();
  const adapter = new PhaserAdapter();
  await adapter.init(stage, project);
  const runtime = new Runtime(adapter, project);
  runtime.start();
  session = { adapter, runtime };
  (window as unknown as { __cobbleRuntime?: Runtime }).__cobbleRuntime = runtime;
  window.clearInterval(hudTimer);
  hudTimer = window.setInterval(renderHud, 200);
  renderHud();
  post({ type: 'playing' });
}

function stop(): void {
  if (!session) return;
  session.runtime.stop();
  session.adapter.destroy();
  session = null;
  window.clearInterval(hudTimer);
  hud.replaceChildren();
  (window as unknown as { __cobbleRuntime?: Runtime }).__cobbleRuntime = undefined;
  post({ type: 'stopped' });
}

window.addEventListener('message', (event: MessageEvent) => {
  const data = event.data as { type?: string; project?: CompiledProject } | null;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'run' && data.project) {
    void run(data.project);
  } else if (data.type === 'stop') {
    stop();
  }
});

post({ type: 'ready' });
