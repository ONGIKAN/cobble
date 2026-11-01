import type { InputConfig } from '@cobbox/project';

export interface TouchControls {
  root: HTMLElement;
  /** 当前按下的输入事件 id 集合（与键盘状态合并后交给运行时） */
  active: Set<string>;
  destroy(): void;
}

const STYLE_ID = 'cobble-touch-style';

const CSS = `
.cobble-touch {
  position: absolute;
  inset: 0;
  pointer-events: none;
  touch-action: none;
  z-index: 10;
}
.cobble-touch-joystick,
.cobble-touch-btn {
  position: absolute;
  pointer-events: auto;
  border-radius: 0;
  border: 2px solid rgba(255, 255, 255, 0.55);
  background: rgba(13, 15, 18, 0.42);
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
.cobble-touch-joystick {
  left: 16px;
  bottom: 16px;
  width: 104px;
  height: 104px;
  touch-action: none;
}
.cobble-touch-knob {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 44px;
  height: 44px;
  margin: -22px 0 0 -22px;
  border-radius: 0;
  background: rgba(255, 107, 53, 0.85);
  border: 2px solid rgba(255, 255, 255, 0.7);
  pointer-events: none;
}
.cobble-touch-btn {
  right: 16px;
  width: 76px;
  height: 76px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: #fff;
  font: 600 15px/1 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  touch-action: none;
}

.cobble-touch-icon {
  font-size: 22px;
  line-height: 1;
}

.cobble-touch-btn.is-icon .cobble-touch-icon {
  font-size: 26px;
}

.cobble-touch-label {
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  opacity: 0.92;
}
.cobble-touch-joy-sm .cobble-touch-joystick {
  width: 72px;
  height: 72px;
}

.cobble-touch-joy-lg .cobble-touch-joystick {
  width: 120px;
  height: 120px;
}

.cobble-touch-btn-sm .cobble-touch-btn {
  width: 52px;
  height: 52px;
  font-size: 12px;
}

.cobble-touch-btn-lg .cobble-touch-btn {
  width: 84px;
  height: 84px;
  font-size: 16px;
}

.cobble-touch-btn.is-active {
  background: rgba(255, 107, 53, 0.8);
}
.cobble-touch-joystick.is-active {
  border-color: rgba(255, 107, 53, 0.85);
}
`;

function ensureStyle(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  doc.head.appendChild(style);
}

/**
 * 原生触屏控件层：虚拟摇杆 + 自定义按钮。
 * 只在触屏设备（pointer: coarse）或 URL 带 ?touch=1 时挂载，覆盖在舞台上，
 * 结果写入 active 集合，由适配器合并进 InputState。
 */
/** 触屏按钮默认标签以 i18n key 存储，运行时按页面语言解析（引擎包不依赖 i18next） */
const TOUCH_LABELS: Record<string, { zh: string; en: string }> = {
  'inputs.jumpButton': { zh: '跳', en: 'Jump' },
  'inputs.actionButton': { zh: '攻击', en: 'Attack' },
};

function localizeLabel(label: string): string {
  const entry = TOUCH_LABELS[label];
  if (!entry) return label;
  const english = (document.documentElement.lang || '').toLowerCase().startsWith('en');
  return english ? entry.en : entry.zh;
}

export function mountTouchControls(container: HTMLElement, input: InputConfig): TouchControls | null {
  const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const forced = typeof location !== 'undefined' && new URLSearchParams(location.search).has('touch');
  if (!coarse && !forced) return null;
  if (!input.joystick && input.buttons.length === 0) return null;

  const doc = container.ownerDocument;
  ensureStyle(doc);
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

  const root = doc.createElement('div');
  const sizeClass = input.joystickSize ?? 'md';
  const buttonSizeClass = input.buttonSize ?? 'md';
  root.className = `cobble-touch cobble-touch-joy-${sizeClass} cobble-touch-btn-${buttonSizeClass}`;
  root.dataset.testid = 'touch-controls';
  const active = new Set<string>();

  let destroyJoystick: (() => void) | null = null;
  if (input.joystick) {
    const base = doc.createElement('div');
    const joySide = input.joystickSide ?? 'left';
    base.className = 'cobble-touch-joystick';
    base.dataset.testid = 'joystick';
    base.dataset.side = joySide;
    base.style.left = joySide === 'left' ? '16px' : 'auto';
    base.style.right = joySide === 'right' ? '16px' : 'auto';
    const joyOpacity = input.joystickOpacity ?? 55;
    base.style.opacity = String(joyOpacity / 100);
    const knob = doc.createElement('div');
    knob.className = 'cobble-touch-knob';
    base.appendChild(knob);
    root.appendChild(base);
    destroyJoystick = mountJoystick(base, knob, active);
  }

  const buttons: Array<() => void> = [];
  const defaultSize = input.buttonSize ?? 'md';
  const sizePx = { sm: 52, md: 76, lg: 84 } as const;
  const sideCount = { left: 0, right: 0 };
  input.buttons.forEach((button) => {
    const size = button.size ?? defaultSize;
    const side = button.side ?? 'right';
    const px = sizePx[size];
    const el = doc.createElement('div');
    el.className = 'cobble-touch-btn';
    el.dataset.testid = `touch-btn-${button.id}`;
    el.dataset.side = side;
    el.style.width = `${px}px`;
    el.style.height = `${px}px`;
    el.style.bottom = `${16 + sideCount[side] * (px + 16)}px`;
    el.style.left = side === 'left' ? '16px' : 'auto';
    el.style.right = side === 'right' ? '16px' : 'auto';
    el.style.opacity = String((button.opacity ?? 62) / 100);
    el.style.fontSize = size === 'sm' ? '12px' : size === 'lg' ? '16px' : '15px';
    if (button.icon) {
      el.classList.add('is-icon');
      const icon = doc.createElement('span');
      icon.className = 'cobble-touch-icon';
      icon.textContent = button.icon;
      el.appendChild(icon);
      const label = doc.createElement('span');
      label.className = 'cobble-touch-label';
      label.textContent = localizeLabel(button.label);
      el.appendChild(label);
    } else {
      el.textContent = localizeLabel(button.label);
    }
    sideCount[side] += 1;
    root.appendChild(el);
    buttons.push(mountButton(el, button.bindingId, active));
  });

  container.appendChild(root);

  return {
    root,
    active,
    destroy(): void {
      destroyJoystick?.();
      for (const off of buttons) off();
      root.remove();
    },
  };
}

function mountJoystick(base: HTMLElement, knob: HTMLElement, active: Set<string>): () => void {
  const DIRECTIONS = ['left', 'right', 'up', 'down'] as const;
  let pointerId: number | null = null;

  const directionOf = (event: PointerEvent): Set<string> => {
    const rect = base.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const threshold = rect.width * 0.18;
    const next = new Set<string>();
    if (Math.abs(dx) > threshold) next.add(dx < 0 ? 'left' : 'right');
    if (Math.abs(dy) > threshold) next.add(dy < 0 ? 'up' : 'down');
    const max = rect.width / 2;
    const kx = Math.max(-max, Math.min(max, dx));
    const ky = Math.max(-max, Math.min(max, dy));
    knob.style.transform = `translate(${kx}px, ${ky}px)`;
    return next;
  };

  const apply = (next: Set<string>): void => {
    for (const dir of DIRECTIONS) {
      if (next.has(dir)) active.add(dir);
      else active.delete(dir);
    }
    base.classList.toggle('is-active', next.size > 0);
  };

  const onDown = (event: PointerEvent): void => {
    pointerId = event.pointerId;
    try {
      base.setPointerCapture(event.pointerId);
    } catch {
      /* 合成事件可能没有有效 pointerId */
    }
    apply(directionOf(event));
    event.preventDefault();
  };
  const onMove = (event: PointerEvent): void => {
    if (pointerId === null || event.pointerId !== pointerId) return;
    apply(directionOf(event));
  };
  const onUp = (event: PointerEvent): void => {
    if (pointerId !== null && event.pointerId !== pointerId) return;
    pointerId = null;
    knob.style.transform = '';
    apply(new Set());
  };

  base.addEventListener('pointerdown', onDown);
  base.addEventListener('pointermove', onMove);
  base.addEventListener('pointerup', onUp);
  base.addEventListener('pointercancel', onUp);
  base.addEventListener('lostpointercapture', onUp);
  return () => {
    base.removeEventListener('pointerdown', onDown);
    base.removeEventListener('pointermove', onMove);
    base.removeEventListener('pointerup', onUp);
    base.removeEventListener('pointercancel', onUp);
    base.removeEventListener('lostpointercapture', onUp);
  };
}

function mountButton(el: HTMLElement, bindingId: string, active: Set<string>): () => void {
  const press = (event: PointerEvent): void => {
    try {
      el.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
    active.add(bindingId);
    el.classList.add('is-active');
    event.preventDefault();
  };
  const release = (): void => {
    active.delete(bindingId);
    el.classList.remove('is-active');
  };
  el.addEventListener('pointerdown', press);
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('lostpointercapture', release);
  return () => {
    el.removeEventListener('pointerdown', press);
    el.removeEventListener('pointerup', release);
    el.removeEventListener('pointercancel', release);
    el.removeEventListener('lostpointercapture', release);
  };
}
