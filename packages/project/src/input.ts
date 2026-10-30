import type { InputConfig, InputBinding, ProjectDoc } from './types';

/** 默认输入事件：每个事件绑定多个按键；摇杆使用 left/right/up/down 四个事件 */
export const DEFAULT_INPUT: InputConfig = {
  bindings: [
    { id: 'left', name: 'inputs.left', keys: ['ArrowLeft', 'KeyA'] },
    { id: 'right', name: 'inputs.right', keys: ['ArrowRight', 'KeyD'] },
    { id: 'up', name: 'inputs.up', keys: ['ArrowUp', 'KeyW'] },
    { id: 'down', name: 'inputs.down', keys: ['ArrowDown', 'KeyS'] },
    { id: 'jump', name: 'inputs.jump', keys: ['Space'] },
    { id: 'action', name: 'inputs.action', keys: ['Enter'] },
  ],
  joystick: true,
  joystickSize: 'md',
  joystickSide: 'left',
  joystickOpacity: 55,
  buttonSize: 'md',
  touchMode: 'pad',
  buttons: [
    { id: 'btn-jump', bindingId: 'jump', label: 'inputs.jumpButton', icon: '⬆', size: 'md', side: 'right', opacity: 62 },
  ],
};

/** 默认按键绑定的深拷贝，模板用它构造工程自己的输入配置 */
export function defaultBindings(): InputBinding[] {
  return DEFAULT_INPUT.bindings.map((binding) => ({ ...binding, keys: [...binding.keys] }));
}

export function touchMode(project: ProjectDoc): 'pad' | 'direct' {
  return inputConfig(project).touchMode ?? 'pad';
}

/** 默认名称存的是 i18n key（inputs.*），展示时翻译；用户改过的名字原样显示 */
export function displayName(name: string, translate: (key: string) => string): string {
  return name.startsWith('inputs.') ? translate(name) : name;
}

/** 读取工程的输入配置，缺失/为空时回退默认值 */
export function inputConfig(project: ProjectDoc): InputConfig {
  const input = project.input;
  if (!input || !Array.isArray(input.bindings) || input.bindings.length === 0) return DEFAULT_INPUT;
  return input;
}

export function bindingById(project: ProjectDoc, id: string): InputBinding | undefined {
  return inputConfig(project).bindings.find((b) => b.id === id);
}

export function bindingLabel(project: ProjectDoc, id: string): string {
  return bindingById(project, id)?.name ?? id;
}

const SYMBOLS: Record<string, string> = {
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Space: '␣',
  Enter: '⏎',
  Escape: 'Esc',
  ShiftLeft: 'Shift',
  ShiftRight: 'Shift',
};

export function keyLabel(code: string): string {
  const symbol = SYMBOLS[code];
  if (symbol) return symbol;
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}
