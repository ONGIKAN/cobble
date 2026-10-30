import * as Blockly from 'blockly';
import type { ThemeMode } from './store';

interface StyleSpec {
  colourPrimary: string;
  colourSecondary: string;
  colourTertiary: string;
}

/**
 * 低饱和、扁平化的积木配色：保留分类可辨识度，去掉高亮和强对比，
 * 与编辑器整体的工具化中性色更协调。
 */
const BLOCK_STYLES: Record<string, StyleSpec> = {
  events: { colourPrimary: '#bd8f45', colourSecondary: '#9c7335', colourTertiary: '#7c5a26' },
  motion: { colourPrimary: '#547fab', colourSecondary: '#42678c', colourTertiary: '#31506e' },
  looks: { colourPrimary: '#8d79b7', colourSecondary: '#72619a', colourTertiary: '#584c79' },
  sound: { colourPrimary: '#b27a9f', colourSecondary: '#926485', colourTertiary: '#734f6a' },
  control: { colourPrimary: '#b79537', colourSecondary: '#967a2b', colourTertiary: '#765f21' },
  sensing: { colourPrimary: '#4a958b', colourSecondary: '#3b7a72', colourTertiary: '#2d5f58' },
  operators: { colourPrimary: '#629668', colourSecondary: '#4f7a54', colourTertiary: '#3d5f42' },
  variables: { colourPrimary: '#ac7c50', colourSecondary: '#8e653f', colourTertiary: '#704e31' },
};

const DARK_COMPONENTS = {
  workspaceBackgroundColour: '#15171a',
  toolboxBackgroundColour: '#131519',
  toolboxForegroundColour: '#c9ccd2',
  flyoutBackgroundColour: '#191c20',
  flyoutForegroundColour: '#c9ccd2',
  flyoutOpacity: 1,
  scrollbarColour: '#33373e',
  scrollbarOpacity: 0.5,
  insertionMarkerColour: '#9d7bff',
  insertionMarkerOpacity: 0.3,
  markerColour: '#9d7bff',
  cursorColour: '#9d7bff',
};

const LIGHT_COMPONENTS = {
  workspaceBackgroundColour: '#f3f3ee',
  toolboxBackgroundColour: '#fbfbf7',
  toolboxForegroundColour: '#2a2c30',
  flyoutBackgroundColour: '#f7f7f1',
  flyoutForegroundColour: '#2a2c30',
  flyoutOpacity: 1,
  scrollbarColour: '#c2c2b8',
  scrollbarOpacity: 0.8,
  insertionMarkerColour: '#6b46e5',
  insertionMarkerOpacity: 0.28,
  markerColour: '#6b46e5',
  cursorColour: '#6b46e5',
};

let squareRendererRegistered = false;

/**
 * 自定义常量的「方正」渲染器：所有圆角半径为 0，只保留 Blockly 的缺口/凸台结构，
 * 让积木呈现直角矩形的观感。
 */
class SquareConstantProvider extends Blockly.blockRendering.ConstantProvider {
  constructor() {
    super();
    this.CORNER_RADIUS = 0;
    this.FIELD_BORDER_RECT_RADIUS = 0;
    // 事件积木的圆顶（hat）也压平，整体保持直角矩形
    this.START_HAT_HEIGHT = 0;
    this.START_HAT_WIDTH = 0;
    this.ADD_START_HATS = true;
  }
}

class SquareRenderer extends Blockly.thrasos.Renderer {
  protected override makeConstants_(): Blockly.blockRendering.ConstantProvider {
    return new SquareConstantProvider();
  }
}

/** 注册 'square' 渲染器（幂等），BlocksView 以 renderer: 'square' 注入。 */
export function registerSquareRenderer(): void {
  if (squareRendererRegistered) return;
  squareRendererRegistered = true;
  Blockly.blockRendering.register('square', SquareRenderer);
}

export function createBlocklyTheme(mode: ThemeMode): Blockly.Theme {
  const theme = new Blockly.Theme(
    `cobble-${mode}`,
    BLOCK_STYLES,
    undefined,
    mode === 'dark' ? DARK_COMPONENTS : LIGHT_COMPONENTS,
  );
  theme.startHats = true;
  theme.fontStyle = {
    family: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', ui-sans-serif, sans-serif",
    weight: '500',
    size: 12,
  };
  return theme;
}
