import { Runtime } from '@cobble/runtime';
import { PhaserAdapter } from '@cobble/engine-phaser';
import type { CompiledProject } from '@cobble/project';

// 单文件导出的播放器：读取内联 JSON（已编译的 IR 工程），不依赖 Blockly。
const dataNode = document.getElementById('cobble-project');
const stageNode = document.getElementById('stage');
const hudNode = document.getElementById('hud');
if (!dataNode || !stageNode || !hudNode) throw new Error('缺少播放器容器');

const project = JSON.parse(dataNode.textContent ?? '{}') as CompiledProject;
const stage: HTMLElement = stageNode;
const hud: HTMLElement = hudNode;

function renderHud(runtime: Runtime): void {
  // 以下划线开头的变量是模板内部辅助变量（例如贪吃蛇的尾部历史），不显示在 HUD
  const variables = runtime.getVariables().filter((variable) => !variable.name.startsWith('_'));
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

async function boot(): Promise<void> {
  const adapter = new PhaserAdapter();
  await adapter.init(stage, project);
  const runtime = new Runtime(adapter, project);
  runtime.start();
  (window as unknown as { __cobbleRuntime?: Runtime }).__cobbleRuntime = runtime;
  renderHud(runtime);
  window.setInterval(() => renderHud(runtime), 200);
}

void boot();
