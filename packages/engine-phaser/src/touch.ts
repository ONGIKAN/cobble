import type { InputConfig } from '@cobble/project';

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
  align-items: center;
  justify-content: center;
  color: #fff;
  font: 600 15px/1 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  touch-action: none;
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
export function mountTouchControls(container: HTMLElement, input: InputConfig): TouchControls | null {
  const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const forced = typeof location !== 'undefined' && new URLSearchParams(location.search).has('touch');
  if (!coarse && !forced) return null;
  if (!input.joystick && input.buttons.length === 0) return null;

  const doc = container.ownerDocument;
  ensureStyle(doc);
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

  const root = doc.createElement('div');
  root.className = 'cobble-touch';
  root.dataset.testid = 'touch-controls';
  const active = new Set<string>();

  let destroyJoystick: (() => void) | null = null;
  if (input.joystick) {
    const base = doc.createElement('div');
    base.className = 'cobble-touch-joystick';
    base.dataset.testid = 'joystick';
    const knob = doc.createElement('div');
    knob.className = 'cobble-touch-knob';
    base.appendChild(knob);
    root.appendChild(base);
    destroyJoystick = mountJoystick(base, knob, active);
  }

  const buttons: Array<() => void> = [];
  input.buttons.forEach((button, index) => {
    const el = doc.createElement('div');
    el.className = 'cobble-touch-btn';
    el.dataset.testid = `touch-btn-${button.id}`;
    el.textContent = button.label;
    el.style.bottom = `${16 + index * 92}px`;
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
