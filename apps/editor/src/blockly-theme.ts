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
  events: { colourPrimary: '#7a8cb8', colourSecondary: '#62719a', colourTertiary: '#4b577c' },
  motion: { colourPrimary: '#5c93b0', colourSecondary: '#4a7690', colourTertiary: '#385a6f' },
  looks: { colourPrimary: '#8f7fb8', colourSecondary: '#75669a', colourTertiary: '#5a4e7a' },
  sound: { colourPrimary: '#b07fa6', colourSecondary: '#946a8c', colourTertiary: '#775670' },
  control: { colourPrimary: '#b0965f', colourSecondary: '#957c4a', colourTertiary: '#786237' },
  sensing: { colourPrimary: '#5a9e93', colourSecondary: '#488277', colourTertiary: '#37645c' },
  operators: { colourPrimary: '#7aa26f', colourSecondary: '#628455', colourTertiary: '#4a663d' },
  variables: { colourPrimary: '#b0855f', colourSecondary: '#946d4a', colourTertiary: '#775638' },
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
    `cobbox-${mode}`,
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
