import type { CompiledProject } from '@cobbox/project';

/** 引擎无关的输入快照（坐标为 Scratch 坐标系） */
export interface InputState {
  keysDown: Set<string>;
  /** 触屏控件当前按下的输入事件 id（摇杆/按钮） */
  touchBindings: Set<string>;
  mouseDown: boolean;
  /** 本帧内按下（边沿），由适配器在每次 getInput 后清除 */
  mousePressed: boolean;
  mouseX: number;
  mouseY: number;
  /** 触屏直接拖动模式：当前被拖动的角色 id（未拖动为 null） */
  draggingId: string | null;
}

/** 运行时每帧交给引擎渲染的角色快照 */
export interface SpriteVisual {
  id: string;
  x: number;
  y: number;
  direction: number;
  size: number;
  visible: boolean;
  zIndex: number;
  rotationStyle: 'all-around' | 'left-right' | 'none';
  costumeIndex: number;
}

/**
 * 引擎适配层：运行时只依赖这个接口。
 * POC 用 Phaser 4 实现；未来可换 WebGL / 原生 canvas / 其他引擎而不动 IR 与运行时。
 */
export interface EngineAdapter {
  init(container: HTMLElement, project: CompiledProject): Promise<void>;
  render(sprites: SpriteVisual[]): void;
  say(spriteId: string, text: string, seconds: number): void;
  playSound(soundId: string): void;
  stopSounds(): void;
  setVolume(percent: number): void;
  getInput(): InputState;
  onFrame(callback: (dtMs: number) => void): void;
  /** 角色在舞台坐标系中的当前像素尺寸（受大小百分比影响） */
  getSize(spriteId: string): { width: number; height: number };
  /** 直接触摸模式下设置某个角色是否可被拖动 */
  setDraggable(spriteId: string, draggable: boolean): void;
  destroy(): void;
}
