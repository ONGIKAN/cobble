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
  /** spriteId -> Blockly 序列化状态（Blockly.serialization.workspaces.save） */
  scripts: Record<string, unknown>;
}
