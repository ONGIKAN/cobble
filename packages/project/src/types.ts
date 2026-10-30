/** 工程数据模型（.gproj = project.json + assets/） */

export type RotationStyle = 'all-around' | 'left-right' | 'none';
export type AssetKind = 'image' | 'audio';

export interface AssetDef {
  id: string;
  name: string;
  kind: AssetKind;
  /** POC: data URL；后续版本改为 .gproj 内相对路径 */
  dataUrl?: string;
  path?: string;
}

export interface CostumeDef {
  name: string;
  assetId: string;
}

export interface SoundDef {
  id: string;
  name: string;
  assetId: string;
}

export interface SpriteDef {
  id: string;
  name: string;
  /** Scratch 坐标系：原点在舞台中心，+y 向上 */
  x: number;
  y: number;
  /** 方向 0..359，0=上，90=右 */
  rotation: number;
  /** 大小百分比 */
  size: number;
  visible: boolean;
  zIndex: number;
  rotationStyle: RotationStyle;
  costumes: CostumeDef[];
  sounds: SoundDef[];
}

export interface StageDef {
  width: number;
  height: number;
  background: string;
}

export interface VariableDef {
  id: string;
  name: string;
  value: number | string;
}

export interface InputBinding {
  id: string;
  name: string;
  /** KeyboardEvent.code 列表：同一个输入事件可以绑定多个按键 */
  keys: string[];
}

/** 触屏控件在屏幕的哪一侧 */
export type PadSide = 'left' | 'right';

export interface TouchButtonDef {
  id: string;
  /** 指向 InputBinding.id */
  bindingId: string;
  label: string;
  /** 图标（emoji 或 1–2 个字符）；设置了图标时按钮内显示图标 + 小字标签 */
  icon?: string;
  /** 按钮尺寸覆盖（默认跟随工程 buttonSize） */
  size?: PadSize;
  /** 按钮在屏幕左侧还是右侧（默认 right） */
  side?: PadSide;
  /** 背景不透明度 10–100（默认 62） */
  opacity?: number;
}

export type PadSize = 'sm' | 'md' | 'lg';

/** 触屏互动模式：pad = 摇杆 + 按钮手柄；direct = 直接触摸舞台（点击互动 / 拖动角色） */
export type TouchMode = 'pad' | 'direct';

export interface InputConfig {
  bindings: InputBinding[];
  /** 显示原生虚拟摇杆（绑定 left/right/up/down 四个输入事件） */
  joystick: boolean;
  /** 摇杆尺寸（每个工程独立配置，默认 md） */
  joystickSize?: PadSize;
  /** 屏幕按钮尺寸（每个工程独立配置，默认 md） */
  buttonSize?: PadSize;
  /** 触屏互动模式（默认 pad） */
  touchMode?: TouchMode;
  /** 摇杆在屏幕左侧还是右侧（默认 left） */
  joystickSide?: PadSide;
  /** 摇杆不透明度 10–100（默认 55） */
  joystickOpacity?: number;
  buttons: TouchButtonDef[];
}

export interface ProjectMeta {
  id: string;
  name: string;
  updatedAt: string;
}

export interface ProjectDoc {
  schemaVersion: 1;
  meta: ProjectMeta;
  stage: StageDef;
  assets: AssetDef[];
  variables: VariableDef[];
  sprites: SpriteDef[];
  /** 输入事件与触屏控件（可省略，省略时用 DEFAULT_INPUT） */
  input?: InputConfig;
  /** spriteId -> Blockly 序列化状态（Blockly.serialization.workspaces.save） */
  scripts: Record<string, unknown>;
}
